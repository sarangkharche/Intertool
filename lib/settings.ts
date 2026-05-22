import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { isLocalSaasFallbackMode, isSaasMode } from "./org";
import { setUserRole, ensureUserRecord } from "./rbac";
import {
  cpAddUserOrg,
  cpDeleteOrg,
  cpGetOrgForUser,
  cpGetOrgMembers,
  cpGetOrgsForUser,
  cpGetSettings,
  cpIsOrgMember,
  cpOrgExists,
  cpRemoveUserOrg,
  cpSaveSettings,
  hasControlPlane,
} from "./control-plane";

const SETTINGS_PATH = path.resolve(process.cwd(), "registry", "settings.json");
const LOCAL_SAAS_PATH = path.resolve(
  process.cwd(),
  "registry",
  "local-saas.json"
);

export interface RegistrySettings {
  /** Storage backend for registry objects */
  storage_driver?: "s3" | "vercel-blob";
  /** Username of the admin who configured this */
  admin_username: string;
  /** Email of the admin (for Google-authed admins) */
  admin_email?: string;
  /** When settings were last configured */
  configured_at: string;
  /** S3 bucket name */
  s3_bucket: string;
  /** S3 region */
  s3_region: string;
  /** S3 access key ID */
  s3_access_key_id: string;
  /** S3 secret access key */
  s3_secret_access_key: string;
  /** Custom S3 endpoint for S3-compatible services (MinIO, R2, Wasabi) */
  s3_endpoint?: string;
  /** AWS session token for temporary/SSO credentials */
  s3_session_token?: string;
  /** Optional object key prefix for shared-bucket SaaS tenant isolation */
  s3_prefix?: string;
  /** Optional Vercel Blob store id for managed storage */
  blob_store_id?: string;
  /** Optional Vercel Blob read/write token; prefer environment variables */
  blob_read_write_token?: string;
  /** Blob access mode for registry objects */
  blob_access?: "private" | "public";
  /** Org slug (SaaS mode only) */
  org_slug?: string;
  /** Org display name (SaaS mode only) */
  org_name?: string;
  /** GitHub OAuth App Client ID (admin-configurable) */
  github_client_id?: string;
  /** GitHub OAuth App Client Secret (admin-configurable) */
  github_client_secret?: string;
  /** Google OAuth Client ID (admin-configurable) */
  google_client_id?: string;
  /** Google OAuth Client Secret (admin-configurable) */
  google_client_secret?: string;
  /** Whether Google Workspace auth is enabled */
  google_auth_enabled?: boolean;
  /** Allowed Google Workspace domains (e.g., ["acme.com"]) */
  google_allowed_domains?: string[];
  /** GitHub organization login name (e.g., "intertoolsh") */
  github_org?: string;
  /** Whether GitHub org membership is required to sign in */
  github_org_required?: boolean;
  /** Webhook URL for event notifications */
  webhook_url?: string;
  /** Which events trigger webhooks */
  webhook_events?: ("publish" | "update" | "delete")[];
  /** Require admin review before non-admins publish new registry items */
  publish_review_required?: boolean;
  /** SaaS plan identifier */
  plan?: "free" | "team" | "business" | "enterprise";
  /** Subscription lifecycle state from the billing provider */
  subscription_status?: "trialing" | "active" | "past_due" | "canceled";
  /** Stripe customer id for hosted billing */
  stripe_customer_id?: string;
  /** Stripe subscription id for hosted billing */
  stripe_subscription_id?: string;
}

// ── KV store (SaaS mode) ──

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

function kvKey(orgSlug: string): string {
  return `org:${orgSlug}:settings`;
}

interface LocalSaasData {
  orgs?: Record<string, RegistrySettings>;
  user_orgs?: Record<string, string>;
  user_org_memberships?: Record<string, string[]>;
  members?: Record<string, string[]>;
}

function readLocalSaasData(): LocalSaasData {
  try {
    if (!fs.existsSync(LOCAL_SAAS_PATH)) return {};
    return JSON.parse(fs.readFileSync(LOCAL_SAAS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeLocalSaasData(data: LocalSaasData): void {
  const dir = path.dirname(LOCAL_SAAS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_SAAS_PATH, JSON.stringify(data, null, 2) + "\n");
}

// ── Env var fallback (for Vercel deployments in self-hosted mode) ──

function getSettingsFromEnv(): RegistrySettings | null {
  if (process.env.INTERTOOL_STORAGE_DRIVER === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      return null;
    }
    return {
      storage_driver: "vercel-blob",
      admin_username: process.env.INTERTOOL_ADMIN ?? "",
      configured_at: "",
      s3_bucket: "vercel-blob",
      s3_region: process.env.BLOB_REGION ?? "iad1",
      s3_access_key_id: "managed",
      s3_secret_access_key: "managed",
      s3_prefix: process.env.S3_PREFIX || undefined,
      blob_store_id: process.env.BLOB_STORE_ID || undefined,
      blob_access: "private",
    };
  }

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const googleDomains = process.env.GOOGLE_ALLOWED_DOMAINS
    ? process.env.GOOGLE_ALLOWED_DOMAINS.split(",")
        .map((d) => d.trim())
        .filter(Boolean)
    : undefined;

  return {
    admin_username: process.env.INTERTOOL_ADMIN ?? "",
    configured_at: "",
    s3_bucket: bucket,
    s3_region: process.env.S3_REGION ?? "us-east-1",
    s3_access_key_id: accessKeyId,
    s3_secret_access_key: secretAccessKey,
    s3_endpoint: process.env.S3_ENDPOINT || undefined,
    s3_session_token: process.env.S3_SESSION_TOKEN || undefined,
    s3_prefix: process.env.S3_PREFIX || undefined,
    google_auth_enabled: googleDomains ? true : undefined,
    google_allowed_domains: googleDomains,
    github_org: process.env.GITHUB_ORG || undefined,
    github_org_required: !!process.env.GITHUB_ORG,
  };
}

function hostedStorageSettings(
  orgSlug: string,
  orgName: string,
  adminUsername: string
): RegistrySettings | null {
  if (process.env.INTERTOOL_MANAGED_STORAGE !== "true") return null;

  if (process.env.INTERTOOL_STORAGE_DRIVER === "vercel-blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      return null;
    }
    return {
      storage_driver: "vercel-blob",
      admin_username: adminUsername,
      configured_at: new Date().toISOString(),
      s3_bucket: "vercel-blob",
      s3_region: process.env.BLOB_REGION ?? "iad1",
      s3_access_key_id: "managed",
      s3_secret_access_key: "managed",
      s3_prefix: `orgs/${orgSlug}`,
      blob_store_id: process.env.BLOB_STORE_ID || undefined,
      blob_access: "private",
      org_slug: orgSlug,
      org_name: orgName,
      plan: "free",
      subscription_status: "trialing",
    };
  }

  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    admin_username: adminUsername,
    configured_at: new Date().toISOString(),
    s3_bucket: bucket,
    s3_region: process.env.S3_REGION ?? "us-east-1",
    s3_access_key_id: accessKeyId,
    s3_secret_access_key: secretAccessKey,
    s3_endpoint: process.env.S3_ENDPOINT || undefined,
    s3_session_token: process.env.S3_SESSION_TOKEN || undefined,
    s3_prefix: `orgs/${orgSlug}`,
    org_slug: orgSlug,
    org_name: orgName,
    plan: "free",
    subscription_status: "trialing",
  };
}

function getSettingsFromFile(): RegistrySettings | null {
  if (!fs.existsSync(SETTINGS_PATH)) return null;
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw) as RegistrySettings;
  } catch {
    return null;
  }
}

// ── Self-hosted Redis fallback (Vercel with read-only FS) ──

const SELF_HOSTED_REDIS_KEY = "self-hosted:settings";

function hasRedis(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// ── Public API ──

/**
 * Get settings for a given org (SaaS) or the single tenant (self-hosted).
 *
 * Self-hosted resolution order:
 *   1. registry/settings.json (writable filesystem — local dev, Docker)
 *   2. Redis key "self-hosted:settings" (Vercel with Redis)
 *   3. Environment variables S3_BUCKET, S3_ACCESS_KEY_ID, etc. (Vercel without Redis)
 */
export async function getSettings(
  orgSlug?: string
): Promise<RegistrySettings | null> {
  if (isSaasMode()) {
    if (!orgSlug) return null;
    if (hasControlPlane()) {
      return cpGetSettings(orgSlug);
    }
    if (isLocalSaasFallbackMode()) {
      return readLocalSaasData().orgs?.[orgSlug] ?? null;
    }
    const data = await getRedis().get<RegistrySettings>(kvKey(orgSlug));
    return data ?? null;
  }

  // Self-hosted: file → Redis → env vars
  const fromFile = getSettingsFromFile();
  if (fromFile) return fromFile;

  if (hasRedis()) {
    const fromRedis = await getRedis().get<RegistrySettings>(
      SELF_HOSTED_REDIS_KEY
    );
    if (fromRedis) return fromRedis;
  }

  return getSettingsFromEnv();
}

/**
 * Save settings for a given org (SaaS) or the single tenant (self-hosted).
 * On Vercel (read-only FS), self-hosted settings are read from env vars
 * and this function is a no-op — configure via Vercel dashboard instead.
 */
export async function saveSettings(
  settings: RegistrySettings,
  orgSlug?: string
): Promise<boolean> {
  if (isSaasMode()) {
    const slug = orgSlug ?? settings.org_slug;
    if (!slug) throw new Error("org_slug required in SaaS mode");
    if (hasControlPlane()) {
      await cpSaveSettings({ ...settings, org_slug: slug }, slug);
      return true;
    }
    if (isLocalSaasFallbackMode()) {
      const data = readLocalSaasData();
      data.orgs ??= {};
      data.orgs[slug] = { ...settings, org_slug: slug };
      writeLocalSaasData(data);
      return true;
    }
    await getRedis().set(kvKey(slug), settings);
    return true;
  }

  // Self-hosted: try file-based, fall back to Redis if read-only (Vercel)
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
    return true;
  } catch {
    // Read-only filesystem (Vercel) — try Redis
    if (hasRedis()) {
      await getRedis().set(SELF_HOSTED_REDIS_KEY, settings);
      return true;
    }
  }
  return false;
}

/**
 * Check if a user is admin (owner or admin role).
 * Delegates to the RBAC system, with fallback to legacy admin_username check.
 */
export async function isAdmin(
  username: string,
  orgSlug?: string
): Promise<boolean> {
  // Check RBAC system first
  try {
    const { getUserRole } = await import("./rbac");
    const role = await getUserRole(username, orgSlug);
    if (role === "owner" || role === "admin") return true;
    if (role === "member") return false;
    // role is null — fall through to legacy check
  } catch {
    // RBAC not available, fall through
  }

  // Legacy fallback
  const settings = await getSettings(orgSlug);
  if (!settings) return true; // no settings yet = anyone can set up
  if (!settings.admin_username) return true; // env-var config with no admin set
  if (settings.admin_username.toLowerCase() === username.toLowerCase())
    return true;
  if (
    settings.admin_email &&
    settings.admin_email.toLowerCase() === username.toLowerCase()
  )
    return true;
  return false;
}

/**
 * Synchronously resolve OAuth credentials from settings file → env vars.
 * Used at module-init time by auth.ts (must be sync for NextAuth init).
 */
export function getOAuthCredentialsSync(): {
  github: { clientId: string; clientSecret: string } | null;
  google: { clientId: string; clientSecret: string } | null;
} {
  // Try settings file first (self-hosted, writable FS)
  let settings: RegistrySettings | null = null;
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
      settings = JSON.parse(raw) as RegistrySettings;
    }
  } catch {
    // ignore
  }

  const githubId = settings?.github_client_id || process.env.GITHUB_ID;
  const githubSecret =
    settings?.github_client_secret || process.env.GITHUB_SECRET;
  const googleId = settings?.google_client_id || process.env.GOOGLE_CLIENT_ID;
  const googleSecret =
    settings?.google_client_secret || process.env.GOOGLE_CLIENT_SECRET;

  return {
    github:
      githubId && githubSecret
        ? { clientId: githubId, clientSecret: githubSecret }
        : null,
    google:
      googleId && googleSecret
        ? { clientId: googleId, clientSecret: googleSecret }
        : null,
  };
}

/** Map skill type to the folder name in S3 */
export function typeToFolder(type: string): string {
  switch (type) {
    case "skill":
      return "skills";
    case "mcp-server":
      return "mcp-servers";
    case "agent-tool":
      return "agent-tools";
    case "prompt-template":
      return "prompt-templates";
    default:
      return "skills";
  }
}

/** Check if an org exists (SaaS mode) */
export async function orgExists(orgSlug: string): Promise<boolean> {
  if (!isSaasMode()) return true;
  if (hasControlPlane()) {
    return cpOrgExists(orgSlug);
  }
  if (isLocalSaasFallbackMode()) {
    return !!readLocalSaasData().orgs?.[orgSlug];
  }
  const exists = await getRedis().exists(kvKey(orgSlug));
  return exists === 1;
}

/** Register a new org (SaaS mode) */
export async function createOrg(
  orgSlug: string,
  orgName: string,
  adminUsername: string
): Promise<void> {
  if (!isSaasMode()) return;
  const settings: RegistrySettings =
    hostedStorageSettings(orgSlug, orgName, adminUsername) ?? {
      admin_username: adminUsername,
      configured_at: new Date().toISOString(),
      s3_bucket: "",
      s3_region: "us-east-1",
      s3_access_key_id: "",
      s3_secret_access_key: "",
      org_slug: orgSlug,
      org_name: orgName,
      plan: "free",
      subscription_status: "trialing",
    };

  if (hasControlPlane()) {
    if (await cpOrgExists(orgSlug)) {
      throw new Error(`Organization "${orgSlug}" already exists`);
    }
    await cpSaveSettings(settings, orgSlug);
    await cpAddUserOrg(adminUsername, orgSlug, true);
  } else if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    data.orgs ??= {};
    data.user_orgs ??= {};
    data.members ??= {};
    if (data.orgs[orgSlug]) {
      throw new Error(`Organization "${orgSlug}" already exists`);
    }
    const adminId = adminUsername.toLowerCase();
    data.orgs[orgSlug] = settings;
    data.user_orgs[adminId] = orgSlug;
    data.user_org_memberships ??= {};
    data.user_org_memberships[adminId] = Array.from(
      new Set([...(data.user_org_memberships[adminId] ?? []), orgSlug])
    );
    data.members[orgSlug] = Array.from(
      new Set([...(data.members[orgSlug] ?? []), adminId])
    );
    writeLocalSaasData(data);
  } else {
    const existing = await getRedis().exists(kvKey(orgSlug));
    if (existing) throw new Error(`Organization "${orgSlug}" already exists`);
    const adminId = adminUsername.toLowerCase();
    await getRedis().set(kvKey(orgSlug), settings);
    await getRedis().set(`user:${adminId}:org`, orgSlug);
    await getRedis().sadd(`user:${adminId}:orgs`, orgSlug);
  }

  // Ensure the creator is owner in RBAC
  await ensureUserRecord(
    adminUsername,
    {
      display_name: adminUsername,
      provider: "github",
    },
    orgSlug
  );
  await setUserRole(adminUsername, "owner", orgSlug);
}

async function deleteRedisKeysByPattern(pattern: string): Promise<void> {
  const r = getRedis();
  let cursor = 0;
  do {
    const [nextCursor, keys] = await r.scan(cursor, {
      match: pattern,
      count: 100,
    });
    cursor = Number(nextCursor);
    if (keys.length > 0) await r.del(...keys);
  } while (cursor !== 0);
}

async function deleteRedisOrgInvitations(orgSlug: string): Promise<void> {
  const r = getRedis();
  let cursor = 0;
  do {
    const [nextCursor, keys] = await r.scan(cursor, {
      match: `invite:email:${orgSlug}:*`,
      count: 100,
    });
    cursor = Number(nextCursor);
    for (const key of keys) {
      const token = await r.get<string>(key);
      if (token) await r.del(`invite:${token}`);
    }
    if (keys.length > 0) await r.del(...keys);
  } while (cursor !== 0);
}

async function deleteRedisOrgRbac(orgSlug: string): Promise<void> {
  const r = getRedis();
  let cursor = 0;
  do {
    const [nextCursor, keys] = await r.scan(cursor, {
      match: `user:${orgSlug}:*`,
      count: 100,
    });
    cursor = Number(nextCursor);

    for (const key of keys) {
      if (!key.endsWith(":tokens")) continue;
      const tokenHashes = await r.smembers(key);
      if (tokenHashes.length > 0) {
        await r.del(...tokenHashes.map((hash) => `token:${hash}`));
      }
    }
    if (keys.length > 0) await r.del(...keys);
  } while (cursor !== 0);
}

/** Delete an org and all control-plane metadata for it. */
export async function deleteOrg(orgSlug: string): Promise<boolean> {
  if (!isSaasMode()) return false;

  if (hasControlPlane()) {
    return cpDeleteOrg(orgSlug);
  }

  if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    if (!data.orgs?.[orgSlug]) return false;

    delete data.orgs[orgSlug];
    if (data.members) delete data.members[orgSlug];

    for (const [id, activeOrg] of Object.entries(data.user_orgs ?? {})) {
      if (activeOrg === orgSlug) delete data.user_orgs?.[id];
    }

    for (const [id, memberships] of Object.entries(
      data.user_org_memberships ?? {}
    )) {
      const remaining = memberships.filter((memberOrg) => memberOrg !== orgSlug);
      if (remaining.length === 0) {
        delete data.user_org_memberships?.[id];
      } else {
        data.user_org_memberships![id] = remaining;
        data.user_orgs ??= {};
        data.user_orgs[id] = data.user_orgs[id] ?? remaining[0];
      }
    }

    writeLocalSaasData(data);
    return true;
  }

  const r = getRedis();
  const exists = await r.exists(kvKey(orgSlug));
  if (exists !== 1) return false;

  const members = await r.smembers(memberSetKey(orgSlug));
  for (const member of members) {
    await r.srem(`user:${member}:orgs`, orgSlug);
    const currentOrg = await r.get<string>(`user:${member}:org`);
    if (currentOrg === orgSlug) {
      const remainingOrgs = await r.smembers(`user:${member}:orgs`);
      if (remainingOrgs.length > 0) {
        await r.set(`user:${member}:org`, remainingOrgs[0]);
      } else {
        await r.del(`user:${member}:org`);
      }
    }
  }

  await r.del(kvKey(orgSlug), memberSetKey(orgSlug), `audit:${orgSlug}`);
  await deleteRedisOrgInvitations(orgSlug);
  await deleteRedisOrgRbac(orgSlug);
  await deleteRedisKeysByPattern(`rbac:migrated:${orgSlug}`);
  await deleteRedisKeysByPattern(`rbac:migrating:${orgSlug}`);
  return true;
}

/** Get the org slug for a user (SaaS mode) */
export async function getOrgForUser(username: string): Promise<string | null> {
  if (!isSaasMode()) return null;
  const id = username.toLowerCase();
  if (hasControlPlane()) {
    return cpGetOrgForUser(id);
  }
  if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    return (
      data.user_orgs?.[id] ?? data.user_org_memberships?.[id]?.[0] ?? null
    );
  }
  const activeOrg = await getRedis().get<string>(`user:${id}:org`);
  if (activeOrg) return activeOrg;
  const orgs = await getRedis().smembers(`user:${id}:orgs`);
  return orgs[0] ?? null;
}

/** Get all org slugs for a user (SaaS mode). */
export async function getOrgsForUser(username: string): Promise<string[]> {
  if (!isSaasMode()) return [];
  const id = username.toLowerCase();
  if (hasControlPlane()) {
    return cpGetOrgsForUser(id);
  }
  if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    return Array.from(
      new Set([
        ...(data.user_org_memberships?.[id] ?? []),
        ...(data.user_orgs?.[id] ? [data.user_orgs[id]] : []),
      ])
    );
  }
  return await getRedis().smembers(`user:${id}:orgs`);
}

// ── Org membership helpers (SaaS mode) ──

function memberSetKey(orgSlug: string): string {
  return `org:${orgSlug}:members`;
}

/** Add a user to an org's membership set */
export async function addOrgMember(
  orgSlug: string,
  username: string
): Promise<void> {
  const id = username.toLowerCase();
  if (hasControlPlane()) {
    await cpAddUserOrg(id, orgSlug, true);
    return;
  }
  if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    data.members ??= {};
    data.members[orgSlug] = Array.from(
      new Set([...(data.members[orgSlug] ?? []), id])
    );
    data.user_orgs ??= {};
    data.user_orgs[id] = orgSlug;
    data.user_org_memberships ??= {};
    data.user_org_memberships[id] = Array.from(
      new Set([...(data.user_org_memberships[id] ?? []), orgSlug])
    );
    writeLocalSaasData(data);
    return;
  }
  await getRedis().sadd(memberSetKey(orgSlug), id);
  await getRedis().set(`user:${id}:org`, orgSlug);
  await getRedis().sadd(`user:${id}:orgs`, orgSlug);
}

/** Remove a user from an org's membership set */
export async function removeOrgMember(
  orgSlug: string,
  username: string
): Promise<void> {
  const id = username.toLowerCase();
  if (hasControlPlane()) {
    await cpRemoveUserOrg(id, orgSlug);
    return;
  }
  if (isLocalSaasFallbackMode()) {
    const data = readLocalSaasData();
    data.members ??= {};
    data.members[orgSlug] = (data.members[orgSlug] ?? []).filter(
      (member) => member !== id
    );
    if (data.user_orgs?.[id] === orgSlug) delete data.user_orgs[id];
    if (data.user_org_memberships?.[id]) {
      data.user_org_memberships[id] = data.user_org_memberships[id].filter(
        (memberOrg) => memberOrg !== orgSlug
      );
      if (!data.user_org_memberships[id].length) {
        delete data.user_org_memberships[id];
      } else if (!data.user_orgs?.[id]) {
        data.user_orgs ??= {};
        data.user_orgs[id] = data.user_org_memberships[id][0];
      }
    }
    writeLocalSaasData(data);
    return;
  }
  await getRedis().srem(memberSetKey(orgSlug), id);
  await getRedis().srem(`user:${id}:orgs`, orgSlug);
  const currentOrg = await getRedis().get<string>(`user:${id}:org`);
  if (currentOrg === orgSlug) {
    const remainingOrgs = await getRedis().smembers(`user:${id}:orgs`);
    if (remainingOrgs.length > 0) {
      await getRedis().set(`user:${id}:org`, remainingOrgs[0]);
    } else {
      await getRedis().del(`user:${id}:org`);
    }
  }
}

/** Check if a user is a member of an org (also returns true for admin) */
export async function isOrgMember(
  orgSlug: string,
  username: string
): Promise<boolean> {
  const settings = await getSettings(orgSlug);
  if (settings?.admin_username?.toLowerCase() === username.toLowerCase())
    return true;
  if (hasControlPlane()) {
    return cpIsOrgMember(orgSlug, username);
  }
  if (isLocalSaasFallbackMode()) {
    return (
      readLocalSaasData().members?.[orgSlug]?.includes(
        username.toLowerCase()
      ) ?? false
    );
  }
  const result = await getRedis().sismember(
    memberSetKey(orgSlug),
    username.toLowerCase()
  );
  return result === 1;
}

/** Get all members of an org */
export async function getOrgMembers(orgSlug: string): Promise<string[]> {
  if (hasControlPlane()) {
    return cpGetOrgMembers(orgSlug);
  }
  if (isLocalSaasFallbackMode()) {
    return readLocalSaasData().members?.[orgSlug] ?? [];
  }
  return await getRedis().smembers(memberSetKey(orgSlug));
}
