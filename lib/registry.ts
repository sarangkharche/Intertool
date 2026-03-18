import yaml from "yaml";
import { getObject, putObject, deleteObject, listObjects, isS3Configured } from "./s3";
import { getSettings, typeToFolder } from "./settings";
import type { RegistrySettings } from "./settings";
import { getOrgSlug } from "./org";
import { Skill, SkillVersion, Category, SearchFilters, SkillType, SkillStatus, SourceFormat, McpTransport } from "./types";
import { PER_PAGE } from "./constants";
import categoriesData from "../registry/categories.json";

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
      commands["Claude Code"] = `claude mcp add ${skill.slug} npx @${skill.author}/${skill.slug}`;
    } else if (skill.transport === "sse" || skill.transport === "streamable-http") {
      const url = skill.source_url || `https://mcp.${skill.slug}.dev`;
      commands["Claude Code"] = `claude mcp add --transport ${skill.transport} ${skill.slug} ${url}`;
    } else {
      commands["Claude Code"] = `claude mcp add ${skill.slug} npx @${skill.author}/${skill.slug}`;
    }
    commands["Cursor"] = `Add to .cursor/mcp.json: { "${skill.slug}": { "command": "npx", "args": ["@${skill.author}/${skill.slug}"] } }`;
  } else {
    // Skills, agent-tools, prompt-templates — all installed via CLI
    commands["Intertool CLI"] = `npx intertool install @${skill.author}/${skill.slug}`;
  }

  return commands;
}

// ── Settings resolution ──

/**
 * Resolve settings for the current request context.
 * In SaaS mode, reads org slug from request headers.
 * In self-hosted mode, reads from settings.json.
 */
async function resolveSettings(): Promise<RegistrySettings | null> {
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  if (!isS3Configured(settings)) return null;
  return settings;
}

// ── In-memory cache for _index.json (keyed by bucket) ──

const indexCaches = new Map<string, { skills: Skill[]; fetchedAt: number }>();
const CACHE_TTL_MS = 30_000;

async function fetchIndex(settings: RegistrySettings): Promise<Skill[]> {
  const cacheKey = settings.s3_bucket;
  const cached = indexCaches.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.skills;
  }

  const raw = await getObject(settings, "_index.json");
  const skills: Skill[] = raw ? (JSON.parse(raw) as Skill[]) : [];
  indexCaches.set(cacheKey, { skills, fetchedAt: Date.now() });
  return skills;
}

function invalidateCache(bucket: string): void {
  indexCaches.delete(bucket);
}

/** Rebuild _index.json by scanning all skill.json files in the bucket */
async function rebuildIndex(settings: RegistrySettings): Promise<Skill[]> {
  const folders = ["skills", "mcp-servers", "agent-tools", "prompt-templates"];
  const skills: Skill[] = [];

  for (const folder of folders) {
    const keys = await listObjects(settings, `${folder}/`);
    for (const key of keys) {
      if (!key.endsWith("/skill.json")) continue;
      const raw = await getObject(settings, key);
      if (!raw) continue;
      try {
        const skill = JSON.parse(raw) as Skill;
        skills.push({ ...skill, readme: "" });
      } catch {
        // skip malformed
      }
    }
  }

  skills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  await putObject(settings, "_index.json", JSON.stringify(skills, null, 2));
  invalidateCache(settings.s3_bucket);
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
  if (filters.category) skills = skills.filter((s) => s.category_slug === filters.category);
  if (filters.query) {
    const q = filters.query.toLowerCase();
    skills = skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (filters.sort === "name") {
    skills.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    skills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = skills.length;
  const offset = (page - 1) * limit;
  skills = skills.slice(offset, offset + limit);

  return { skills, total };
}

export async function getSkillBySlug(slug: string): Promise<Skill | null> {
  const settings = await resolveSettings();
  if (!settings) return null;

  const folders = ["skills", "mcp-servers", "agent-tools", "prompt-templates"];
  for (const folder of folders) {
    const raw = await getObject(settings, `${folder}/${slug}/skill.json`);
    if (raw) {
      const skill = JSON.parse(raw) as Skill;
      if (!skill.install_commands) {
        skill.install_commands = generateInstallCommands(skill);
      }
      return skill;
    }
  }
  return null;
}

export async function getSkillVersions(slug: string): Promise<SkillVersion[]> {
  const settings = await resolveSettings();
  if (!settings) return [];

  // Find which folder the skill is in
  const folders = ["skills", "mcp-servers", "agent-tools", "prompt-templates"];
  for (const folder of folders) {
    const keys = await listObjects(settings, `${folder}/${slug}/versions/`);
    if (keys.length === 0) continue;

    const versions: SkillVersion[] = [];
    for (const key of keys) {
      if (!key.endsWith(".json")) continue;
      const raw = await getObject(settings, key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw) as SkillVersion;
        versions.push(data);
      } catch {
        // skip malformed
      }
    }

    // Sort newest first
    versions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return versions;
  }

  return [];
}

export async function getCategories(): Promise<Category[]> {
  const settings = await resolveSettings();
  if (!settings) return hardcodedCategories();

  try {
    const raw = await getObject(settings, "_categories.json");
    if (raw) return JSON.parse(raw) as Category[];
  } catch {
    // fall through
  }

  return hardcodedCategories();
}

export async function getFeaturedSkills(): Promise<Skill[]> {
  const { skills } = await getSkills({ limit: 6 });
  return skills;
}

export async function getRecentSkills(): Promise<Skill[]> {
  return getFeaturedSkills();
}

export async function searchSkills(
  query: string
): Promise<Pick<Skill, "slug" | "name" | "type" | "description">[]> {
  const settings = await resolveSettings();
  if (!settings) return [];

  const q = query.toLowerCase();
  const all = await fetchIndex(settings);
  return all
    .filter(
      (s) =>
        s.status === "published" &&
        (s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)))
    )
    .slice(0, 10)
    .map((s) => ({ slug: s.slug, name: s.name, type: s.type, description: s.description }));
}

/** Bump a semver patch: "1.0.0" → "1.0.1" */
function bumpPatch(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.1";
  parts[2]++;
  return parts.join(".");
}

/** Insert or update a skill in S3, with version snapshotting */
export async function upsertSkill(skill: Skill, changelog?: string): Promise<void> {
  const settings = await resolveSettings();
  if (!settings) throw new Error("S3 not configured. Go to /admin to set up storage.");

  const folder = typeToFolder(skill.type);
  const key = `${folder}/${skill.slug}/skill.json`;

  // Check if skill already exists (this is an update, not a new publish)
  const existingRaw = await getObject(settings, key);
  if (existingRaw) {
    const existing = JSON.parse(existingRaw) as Skill;
    const prevVersion = existing.version || "1.0.0";

    // Snapshot the previous version
    const versionMeta: SkillVersion = {
      version: prevVersion,
      changelog: changelog || `Updated to ${bumpPatch(prevVersion)}`,
      author: existing.author,
      created_at: existing.updated_at || existing.created_at,
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

  await putObject(settings, key, JSON.stringify(skill, null, 2));
  await rebuildIndex(settings);
}

/** Delete a skill from S3 and rebuild the index */
export async function deleteSkill(slug: string, type: string): Promise<void> {
  const settings = await resolveSettings();
  if (!settings) throw new Error("S3 not configured");

  const folder = typeToFolder(type);
  await deleteObject(settings, `${folder}/${slug}/skill.json`);
  await rebuildIndex(settings);
}

/** Seed _categories.json into the bucket */
export async function seedCategories(settings?: RegistrySettings): Promise<void> {
  const s = settings ?? (await resolveSettings());
  if (!s) return;
  await putObject(s, "_categories.json", JSON.stringify(hardcodedCategories(), null, 2));
}
