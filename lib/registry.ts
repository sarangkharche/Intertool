import { cache } from "react";
import { createHash, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import yaml from "yaml";
import {
  getObject,
  getObjectBytes,
  getObjectIfChanged,
  putObject,
  deleteObject,
  listObjects,
  isS3Configured,
  storageCacheScope,
} from "./s3";
import { getSettings, typeToFolder } from "./settings";
import type { RegistrySettings } from "./settings";
import { getOrgSlug, isLocalSaasFallbackMode } from "./org";
import {
  Skill,
  SkillVersion,
  Category,
  SearchFilters,
  McpTransport,
  SkillFile,
} from "./types";
import { fireWebhook } from "./webhooks";
import { PER_PAGE } from "./constants";
import categoriesData from "../registry/categories.json";

let registryRedis: Redis | null | undefined;

function getRegistryRedis(): Redis | null {
  if (isLocalSaasFallbackMode()) return null;
  if (registryRedis !== undefined) return registryRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  registryRedis = url && token ? new Redis({ url, token }) : null;
  return registryRedis;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_PACKAGE_FILES = 20;
const MAX_PACKAGE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PACKAGE_TOTAL_BYTES = 50 * 1024 * 1024;

// ── Parsers (used by import/publish) ──

/** Parse SKILL.md frontmatter (YAML between --- delimiters) */
export function parseSkillMd(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  try {
    const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;
    if (!frontmatter.name || !frontmatter.description) return null;
    return { frontmatter, body: match[2] };
  } catch {
    return null;
  }
}

/** Parse MCP Registry server.json format */
export function parseServerJson(content: string): {
  name: string;
  description: string;
  transport?: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
} | null {
  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    if (!data.name || !data.description) return null;

    let transport: McpTransport | undefined;
    let command: string | undefined;
    let args: string[] | undefined;
    let url: string | undefined;

    if (data.transport) {
      const t = data.transport as Record<string, unknown>;
      if (t.type === "stdio") {
        transport = "stdio";
        command = t.command as string | undefined;
        args = t.args as string[] | undefined;
      } else if (t.type === "sse") {
        transport = "sse";
        url = t.url as string | undefined;
      } else if (t.type === "streamable-http") {
        transport = "streamable-http";
        url = t.url as string | undefined;
      }
    }

    return {
      name: data.name as string,
      description: data.description as string,
      transport,
      command,
      args,
      url,
    };
  } catch {
    return null;
  }
}

/** Generate per-tool install commands based on skill type and metadata. */
export function generateInstallCommands(skill: {
  type: string;
  slug: string;
  author: string;
  source_url?: string;
  transport?: McpTransport;
}): Record<string, string> {
  const commands: Record<string, string> = {};

  if (skill.type === "mcp-server") {
    if (skill.transport === "stdio") {
      commands["Claude Code"] =
        `claude mcp add ${skill.slug} npx @${skill.author}/${skill.slug}`;
    } else if (
      skill.transport === "sse" ||
      skill.transport === "streamable-http"
    ) {
      const url = skill.source_url || `https://mcp.${skill.slug}.dev`;
      commands["Claude Code"] =
        `claude mcp add --transport ${skill.transport} ${skill.slug} ${url}`;
    } else {
      commands["Claude Code"] =
        `claude mcp add ${skill.slug} npx @${skill.author}/${skill.slug}`;
    }
    commands["Cursor"] =
      `Add to .cursor/mcp.json: { "${skill.slug}": { "command": "npx", "args": ["@${skill.author}/${skill.slug}"] } }`;
  } else {
    // Skills, agent-tools, prompt-templates — all installed via CLI
    commands["Intertool CLI"] =
      `npx intertool install @${skill.author}/${skill.slug}`;
  }

  return commands;
}

export interface PendingSkillFile {
  path: string;
  size: number;
  contentType?: string;
  body: Uint8Array;
}

export function sanitizeSkillFilePath(rawPath: string): string {
  const parts = rawPath
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._ -]/g, "-"));

  const clean = parts.join("/");
  if (!clean) throw new Error("Package file path is invalid");
  if (clean.length > 240) throw new Error("Package file path is too long");
  return clean;
}

function skillFileObjectKey(
  type: string,
  slug: string,
  filePath: string
): string {
  return `${typeToFolder(type)}/${slug}/files/${filePath}`;
}

export async function replaceSkillFiles(
  slug: string,
  type: string,
  files: PendingSkillFile[]
): Promise<SkillFile[]> {
  const settings = await resolveSettings();
  if (!settings) throw new Error("S3 not configured");
  if (files.length > MAX_PACKAGE_FILES) {
    throw new Error(`At most ${MAX_PACKAGE_FILES} package files are allowed`);
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_PACKAGE_TOTAL_BYTES) {
    throw new Error("Package files must be 50MB or less in total");
  }

  const seen = new Set<string>();
  const prepared = files.map((file) => {
    if (file.size > MAX_PACKAGE_FILE_BYTES) {
      throw new Error(`Package file too large: ${file.path}`);
    }

    const path = sanitizeSkillFilePath(file.path);
    if (seen.has(path)) {
      throw new Error(`Duplicate package file path: ${path}`);
    }
    seen.add(path);

    const contentType = file.contentType || "application/octet-stream";
    const sha256 = createHash("sha256").update(file.body).digest("hex");
    return { path, contentType, sha256, file };
  });

  const folder = typeToFolder(type);
  const filePrefix = `${folder}/${slug}/files/`;
  const existingKeys = await listObjects(settings, filePrefix);
  await Promise.all(existingKeys.map((key) => deleteObject(settings, key)));

  const metadata: SkillFile[] = [];

  for (const item of prepared) {
    await putObject(
      settings,
      skillFileObjectKey(type, slug, item.path),
      item.file.body,
      item.contentType
    );

    metadata.push({
      path: item.path,
      size: item.file.size,
      content_type: item.contentType,
      sha256: item.sha256,
    });
  }

  return metadata;
}

export async function getSkillFile(
  slug: string,
  rawPath: string
): Promise<{
  file: SkillFile;
  body: Uint8Array;
  contentType: string;
} | null> {
  let filePath: string;
  try {
    filePath = sanitizeSkillFilePath(rawPath);
  } catch {
    return null;
  }

  const [settings, skill] = await Promise.all([
    resolveSettings(),
    getSkillBySlug(slug),
  ]);
  if (!settings || !skill) return null;

  const file = skill.files?.find((f) => f.path === filePath);
  if (!file) return null;

  const object = await getObjectBytes(
    settings,
    skillFileObjectKey(skill.type, slug, filePath)
  );
  if (!object) return null;

  return {
    file,
    body: object.body,
    contentType: object.contentType || file.content_type,
  };
}

// ── Settings resolution ──

/**
 * Resolve settings for the current request context.
 * Wrapped with React cache() to deduplicate within a single server request.
 */
const resolveSettings = cache(async (): Promise<RegistrySettings | null> => {
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  if (!isS3Configured(settings)) return null;
  return settings;
});

// ── In-memory cache for _index.json (keyed by storage settings) ──

const indexCaches = new Map<string, Skill[]>();

async function fetchIndex(settings: RegistrySettings): Promise<Skill[]> {
  const scope = storageCacheScope(settings);
  const raw = await getObjectIfChanged(settings, "_index.json");
  if (raw) {
    try {
      const skills: Skill[] = JSON.parse(raw) as Skill[];
      indexCaches.set(scope, skills);
      return skills;
    } catch {
      console.error("[registry] Failed to parse _index.json");
      return indexCaches.get(scope) ?? [];
    }
  }
  indexCaches.delete(scope);
  return [];
}

const categoriesCache = new Map<string, Category[]>();

function invalidateCache(settings: RegistrySettings): void {
  const scope = storageCacheScope(settings);
  indexCaches.delete(scope);
  categoriesCache.delete(scope);
}

/** Rebuild _index.json by scanning all skill.json files in the bucket */
async function rebuildIndex(settings: RegistrySettings): Promise<Skill[]> {
  const folders = ["skills", "mcp-servers", "agent-tools", "prompt-templates"];

  const results = await Promise.all(
    folders.map(async (folder) => {
      const keys = await listObjects(settings, `${folder}/`);
      return Promise.all(
        keys
          .filter((k) => k.endsWith("/skill.json"))
          .map(async (key) => {
            const raw = await getObject(settings, key);
            if (!raw) return null;
            try {
              return { ...(JSON.parse(raw) as Skill), readme: "" };
            } catch {
              return null;
            }
          })
      );
    })
  );

  const skills = results.flat().filter(Boolean) as Skill[];
  skills.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  await putObject(settings, "_index.json", JSON.stringify(skills, null, 2));
  invalidateCache(settings);
  return skills;
}

// ── Hardcoded categories fallback ──

function hardcodedCategories(): Category[] {
  return (categoriesData as Category[]).map((c) => ({
    id: c.id ?? c.slug,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
  }));
}

// ── Public API ──

export async function getSkills(
  filters: SearchFilters = {}
): Promise<{ skills: Skill[]; total: number }> {
  const settings = await resolveSettings();
  if (!settings) return { skills: [], total: 0 };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? PER_PAGE;

  let skills = await fetchIndex(settings);

  // Filter
  skills = skills.filter((s) => s.status === "published");
  if (filters.type) skills = skills.filter((s) => s.type === filters.type);
  if (filters.category)
    skills = skills.filter((s) => s.category_slug === filters.category);
  if (filters.author) {
    const authorLower = filters.author.toLowerCase();
    skills = skills.filter((s) => s.author.toLowerCase() === authorLower);
  }

  // Parse structured filters from query string (e.g. "type:mcp-server tag:ai")
  let freeTextQuery = "";
  if (filters.query) {
    const parsed = parseSearchQuery(filters.query);
    freeTextQuery = parsed.text;
    if (parsed.filters.type) {
      skills = skills.filter((s) => s.type === parsed.filters.type);
    }
    if (parsed.filters.tag) {
      const ft = parsed.filters.tag;
      skills = skills.filter((s) => s.tags.some((t) => t.toLowerCase() === ft));
    }
    if (parsed.filters.author) {
      const fa = parsed.filters.author;
      skills = skills.filter((s) => s.author.toLowerCase() === fa);
    }
  }

  // Free-text scoring
  if (freeTextQuery) {
    const q = freeTextQuery.toLowerCase();
    const scored = skills
      .map((s) => ({ skill: s, score: scoreSkill(s, q) }))
      .filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    skills = scored.map((x) => x.skill);
  } else if (filters.query && !freeTextQuery) {
    // Query had only structured filters, no free text — keep all filtered results
  }

  // Sort
  const sort = filters.sort ?? (filters.query ? "relevance" : "newest");
  if (sort !== "relevance" || !filters.query) {
    if (sort === "name") {
      skills.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "newest" || sort === "relevance") {
      // Default: newest first (relevance already sorted above)
      if (!filters.query) {
        skills.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    }
    // "downloads" sort would need download stats integration; fallback to newest
  }

  const total = skills.length;
  const offset = (page - 1) * limit;
  skills = skills.slice(offset, offset + limit);

  return { skills, total };
}

/** Return tab counts from the cached index without allocating a full array. */
export async function getSkillCounts(username?: string): Promise<{
  total: number;
  byType: Record<string, number>;
  mine: number;
}> {
  const settings = await resolveSettings();
  if (!settings) return { total: 0, byType: {}, mine: 0 };

  const all = await fetchIndex(settings);
  const published = all.filter((s) => s.status === "published");

  const byType: Record<string, number> = {};
  let mine = 0;
  for (const s of published) {
    byType[s.type] = (byType[s.type] || 0) + 1;
    if (username && s.author.toLowerCase() === username.toLowerCase()) {
      mine++;
    }
  }

  return { total: published.length, byType, mine };
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  const settings = await resolveSettings();
  if (!settings) return null;

  // Try to find the type from the cached index to avoid N+1 folder scanning
  const index = await fetchIndex(settings);
  const indexed = index.find((s) => s.slug === slug);
  if (indexed) {
    const folder = typeToFolder(indexed.type);
    const raw = await getObjectIfChanged(
      settings,
      `${folder}/${slug}/skill.json`
    );
    if (raw) {
      try {
        const skill = JSON.parse(raw) as Skill;
        if (!skill.install_commands) {
          skill.install_commands = generateInstallCommands(skill);
        }
        return skill;
      } catch {
        console.error(`[registry] Failed to parse skill.json for ${slug}`);
        return null;
      }
    }
  }

  // Fallback: scan all folders (new/uncached skill)
  const folders = ["skills", "mcp-servers", "agent-tools", "prompt-templates"];
  for (const folder of folders) {
    const raw = await getObjectIfChanged(
      settings,
      `${folder}/${slug}/skill.json`
    );
    if (raw) {
      try {
        const skill = JSON.parse(raw) as Skill;
        if (!skill.install_commands) {
          skill.install_commands = generateInstallCommands(skill);
        }
        return skill;
      } catch {
        console.error(
          `[registry] Failed to parse ${folder}/${slug}/skill.json`
        );
        continue;
      }
    }
  }
  return null;
}

export async function getSkillVersions(slug: string): Promise<SkillVersion[]> {
  const settings = await resolveSettings();
  if (!settings) return [];

  // Use index to find the correct folder directly
  const index = await fetchIndex(settings);
  const indexed = index.find((s) => s.slug === slug);

  const foldersToCheck = indexed
    ? [typeToFolder(indexed.type)]
    : ["skills", "mcp-servers", "agent-tools", "prompt-templates"];

  for (const folder of foldersToCheck) {
    const keys = await listObjects(settings, `${folder}/${slug}/versions/`);
    if (keys.length === 0) continue;

    const versions = (
      await Promise.all(
        keys
          .filter((k) => k.endsWith(".json"))
          .map(async (key) => {
            const raw = await getObjectIfChanged(settings, key);
            if (!raw) return null;
            try {
              return JSON.parse(raw) as SkillVersion;
            } catch {
              return null;
            }
          })
      )
    ).filter(Boolean) as SkillVersion[];

    versions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return versions;
  }

  return [];
}

export async function getSkillVersion(
  slug: string,
  version: string
): Promise<SkillVersion | null> {
  const settings = await resolveSettings();
  if (!settings) return null;

  const index = await fetchIndex(settings);
  const indexed = index.find((s) => s.slug === slug);

  const foldersToCheck = indexed
    ? [typeToFolder(indexed.type)]
    : ["skills", "mcp-servers", "agent-tools", "prompt-templates"];

  for (const folder of foldersToCheck) {
    const raw = await getObject(
      settings,
      `${folder}/${slug}/versions/${version}.json`
    );
    if (!raw) continue;
    try {
      return JSON.parse(raw) as SkillVersion;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getCategories(): Promise<Category[]> {
  const settings = await resolveSettings();
  if (!settings) return hardcodedCategories();

  const scope = storageCacheScope(settings);
  try {
    const raw = await getObjectIfChanged(settings, "_categories.json");
    if (raw) {
      const categories = JSON.parse(raw) as Category[];
      categoriesCache.set(scope, categories);
      return categories;
    }
    categoriesCache.delete(scope);
    return hardcodedCategories();
  } catch {
    return categoriesCache.get(scope) ?? hardcodedCategories();
  }
}

export async function getFeaturedSkills(): Promise<Skill[]> {
  const { skills } = await getSkills({ limit: 6 });
  return skills;
}

export async function getRecentSkills(): Promise<Skill[]> {
  return getFeaturedSkills();
}

/** Derive contributors from the cached index without loading full skill objects. */
export async function getContributors(): Promise<
  { name: string; count: number }[]
> {
  const settings = await resolveSettings();
  if (!settings) return [];

  const all = await fetchIndex(settings);
  const authorMap = new Map<string, number>();
  for (const s of all) {
    if (s.status === "published") {
      authorMap.set(s.author, (authorMap.get(s.author) ?? 0) + 1);
    }
  }
  return Array.from(authorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function searchSkills(
  query: string
): Promise<Pick<Skill, "slug" | "name" | "type" | "description" | "author">[]> {
  const settings = await resolveSettings();
  if (!settings) return [];

  const parsed = parseSearchQuery(query);
  const all = await fetchIndex(settings);
  let skills = all.filter((s) => s.status === "published");

  // Apply structured filters
  if (parsed.filters.type) {
    skills = skills.filter((s) => s.type === parsed.filters.type);
  }
  if (parsed.filters.tag) {
    const ft = parsed.filters.tag;
    skills = skills.filter((s) => s.tags.some((t) => t.toLowerCase() === ft));
  }
  if (parsed.filters.author) {
    const fa = parsed.filters.author;
    skills = skills.filter((s) => s.author.toLowerCase() === fa);
  }

  // Score by free text
  if (parsed.text) {
    const q = parsed.text.toLowerCase();
    return skills
      .map((s) => ({ skill: s, score: scoreSkill(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => ({
        slug: x.skill.slug,
        name: x.skill.name,
        type: x.skill.type,
        description: x.skill.description,
        author: x.skill.author,
      }));
  }

  // No free text, just filters — return first 10
  return skills.slice(0, 10).map((s) => ({
    slug: s.slug,
    name: s.name,
    type: s.type,
    description: s.description,
    author: s.author,
  }));
}

// ── Search query parsing ──

interface ParsedQuery {
  text: string;
  filters: {
    type?: string;
    tag?: string;
    author?: string;
  };
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const filters: ParsedQuery["filters"] = {};
  const textParts: string[] = [];

  for (const part of raw.split(/\s+/)) {
    const match = part.match(/^(type|tag|author):(.+)$/i);
    if (match) {
      const key = match[1].toLowerCase() as keyof ParsedQuery["filters"];
      filters[key] = match[2].toLowerCase();
    } else if (part) {
      textParts.push(part);
    }
  }

  return { text: textParts.join(" "), filters };
}

// ── Search scoring ──

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }
  return matrix[b.length][a.length];
}

/** Score a single token against a field value. Higher = better. */
function scoreToken(token: string, field: string): number {
  if (field === token) return 20; // exact match
  // Word boundary match: token starts a word in the field
  const wordBoundary = new RegExp(`(?:^|[\\s\\-_])${escapeRegex(token)}`);
  if (wordBoundary.test(field)) return 10;
  // Prefix: field word starts with token
  const words = field.split(/[-\s_]+/);
  for (const w of words) {
    if (w.startsWith(token)) return 8;
  }
  // Substring
  if (field.includes(token)) return 4;
  return 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreSkill(skill: Skill, query: string): number {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const name = skill.name.toLowerCase();
  const slug = skill.slug.toLowerCase();
  const desc = skill.description.toLowerCase();
  const tags = skill.tags.map((t) => t.toLowerCase());
  const author = skill.author.toLowerCase();

  let totalScore = 0;
  let allTokensMatch = true;

  for (const token of tokens) {
    let bestTokenScore = 0;

    // Name: highest weight (3x)
    bestTokenScore = Math.max(bestTokenScore, scoreToken(token, name) * 3);
    bestTokenScore = Math.max(bestTokenScore, scoreToken(token, slug) * 3);

    // Tags: 2x weight
    for (const tag of tags) {
      bestTokenScore = Math.max(bestTokenScore, scoreToken(token, tag) * 2);
    }

    // Author: 1.5x
    bestTokenScore = Math.max(bestTokenScore, scoreToken(token, author) * 1.5);

    // Description: 1x
    bestTokenScore = Math.max(bestTokenScore, scoreToken(token, desc));

    if (bestTokenScore === 0) {
      allTokensMatch = false;
      // Fuzzy fallback on name/tags only for tokens > 3 chars
      if (token.length > 3) {
        const candidates = [name, ...name.split(/[-\s_]+/), ...tags];
        for (const c of candidates) {
          if (c.length > 0 && levenshtein(token, c) <= 2) {
            bestTokenScore = 3;
            break;
          }
        }
      }
    }

    totalScore += bestTokenScore;
  }

  // AND semantics: if any token has zero match (even fuzzy), penalize heavily
  if (!allTokensMatch) totalScore = Math.floor(totalScore * 0.3);

  return totalScore;
}

/** Return related skills by tag overlap and shared category, excluding the given slug. */
export async function getRelatedSkills(
  slug: string,
  limit = 4
): Promise<Pick<Skill, "slug" | "name" | "type" | "description" | "author">[]> {
  const settings = await resolveSettings();
  if (!settings) return [];

  const all = await fetchIndex(settings);
  const current = all.find((s) => s.slug === slug);
  if (!current) return [];

  const published = all.filter(
    (s) => s.status === "published" && s.slug !== slug
  );
  const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));

  const scored = published.map((s) => {
    let score = 0;
    // Tag overlap
    for (const tag of s.tags) {
      if (currentTags.has(tag.toLowerCase())) score += 3;
    }
    // Same category
    if (s.category_slug && s.category_slug === current.category_slug)
      score += 2;
    // Same type
    if (s.type === current.type) score += 1;
    return { skill: s, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      slug: x.skill.slug,
      name: x.skill.name,
      type: x.skill.type,
      description: x.skill.description,
      author: x.skill.author,
    }));
}

/** Bump a semver patch: "1.0.0" → "1.0.1" */
function bumpPatch(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.1";
  parts[2]++;
  return parts.join(".");
}

let localMutationQueue = Promise.resolve();

async function withLocalRegistryLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = localMutationQueue.then(fn, fn);
  localMutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function withDistributedRegistryLock<T>(
  settings: RegistrySettings,
  fn: () => Promise<T>
): Promise<T> {
  const r = getRegistryRedis();
  if (!r) return fn();

  const lockKey = `lock:registry:${storageCacheScope(settings)}:mutation`;
  const lockToken = randomUUID();

  for (let attempt = 0; attempt < 80; attempt++) {
    const acquired = await r.set(lockKey, lockToken, { nx: true, ex: 30 });
    if (acquired) {
      try {
        return await fn();
      } finally {
        const currentToken = await r.get<string>(lockKey);
        if (currentToken === lockToken) {
          await r.del(lockKey);
        }
      }
    }

    await sleep(100 + Math.min(attempt, 20) * 25);
  }

  throw new Error("Registry is busy. Retry the operation in a few seconds.");
}

/** Insert or update a skill in S3, with version snapshotting */
export async function upsertSkill(
  skill: Skill,
  changelog?: string
): Promise<void> {
  await withLocalRegistryLock(() => _upsertSkillInner(skill, changelog));
}

async function _upsertSkillInner(
  skill: Skill,
  changelog?: string
): Promise<void> {
  const settings = await resolveSettings();
  if (!settings)
    throw new Error("S3 not configured. Go to /admin to set up storage.");

  await withDistributedRegistryLock(settings, async () => {
    const folder = typeToFolder(skill.type);
    const key = `${folder}/${skill.slug}/skill.json`;

    // Check if skill already exists (this is an update, not a new publish)
    const existingRaw = await getObject(settings, key);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as Skill;
      const prevVersion = existing.version || "1.0.0";

      // Snapshot the previous version (including readme and full skill for diffs)
      const versionMeta: SkillVersion = {
        version: prevVersion,
        changelog: changelog || `Updated to ${bumpPatch(prevVersion)}`,
        author: existing.author,
        created_at: existing.updated_at || existing.created_at,
        readme: existing.readme,
        snapshot: existing,
      };
      await putObject(
        settings,
        `${folder}/${skill.slug}/versions/${prevVersion}.json`,
        JSON.stringify(versionMeta, null, 2)
      );

      // Set the new version on the skill
      skill.version = bumpPatch(prevVersion);
      skill.updated_at = new Date().toISOString();
      // Preserve the original created_at
      skill.created_at = existing.created_at;
    } else {
      // First publish
      skill.version = "1.0.0";
    }

    const isUpdate = !!existingRaw;
    await putObject(settings, key, JSON.stringify(skill, null, 2));
    await rebuildIndex(settings);
    fireWebhook(settings, isUpdate ? "update" : "publish", skill);
  });
}

/** Delete a skill from S3 and rebuild the index */
export async function deleteSkill(slug: string, type: string): Promise<void> {
  await withLocalRegistryLock(async () => {
    const settings = await resolveSettings();
    if (!settings) throw new Error("S3 not configured");

    await withDistributedRegistryLock(settings, async () => {
      const folder = typeToFolder(type);
      const raw = await getObject(settings, `${folder}/${slug}/skill.json`);
      const keys = await listObjects(settings, `${folder}/${slug}/`);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => deleteObject(settings, key)));
      } else {
        await deleteObject(settings, `${folder}/${slug}/skill.json`);
      }
      await rebuildIndex(settings);

      if (raw) {
        try {
          const skill = JSON.parse(raw) as Skill;
          fireWebhook(settings, "delete", skill);
        } catch {
          /* non-fatal */
        }
      }
    });
  });
}

/** Seed _categories.json into the bucket */
export async function seedCategories(
  settings?: RegistrySettings
): Promise<void> {
  const s = settings ?? (await resolveSettings());
  if (!s) return;
  await putObject(
    s,
    "_categories.json",
    JSON.stringify(hardcodedCategories(), null, 2)
  );
  categoriesCache.delete(storageCacheScope(s));
}
