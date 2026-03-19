import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { isSaasMode } from "./org";

const SETTINGS_PATH = path.resolve(process.cwd(), "registry", "settings.json");

export interface RegistrySettings {
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

// ── Env var fallback (for Vercel deployments in self-hosted mode) ──

function getSettingsFromEnv(): RegistrySettings | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  const googleDomains = process.env.GOOGLE_ALLOWED_DOMAINS
    ? process.env.GOOGLE_ALLOWED_DOMAINS.split(",").map((d) => d.trim()).filter(Boolean)
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
    google_auth_enabled: googleDomains ? true : undefined,
    google_allowed_domains: googleDomains,
    github_org: process.env.GITHUB_ORG || undefined,
    github_org_required: !!process.env.GITHUB_ORG,
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
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
export async function getSettings(orgSlug?: string): Promise<RegistrySettings | null> {
  if (isSaasMode()) {
    if (!orgSlug) return null;
    const data = await getRedis().get<RegistrySettings>(kvKey(orgSlug));
    return data ?? null;
  }

  // Self-hosted: file → Redis → env vars
  const fromFile = getSettingsFromFile();
  if (fromFile) return fromFile;

  if (hasRedis()) {
    const fromRedis = await getRedis().get<RegistrySettings>(SELF_HOSTED_REDIS_KEY);
    if (fromRedis) return fromRedis;
  }

  return getSettingsFromEnv();
}

/**
 * Save settings for a given org (SaaS) or the single tenant (self-hosted).
 * On Vercel (read-only FS), self-hosted settings are read from env vars
 * and this function is a no-op — configure via Vercel dashboard instead.
 */
export async function saveSettings(settings: RegistrySettings, orgSlug?: string): Promise<void> {
  if (isSaasMode()) {
    const slug = orgSlug ?? settings.org_slug;
    if (!slug) throw new Error("org_slug required in SaaS mode");
    await getRedis().set(kvKey(slug), settings);
    return;
  }

  // Self-hosted: try file-based, fall back to Redis if read-only (Vercel)
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
  } catch {
    // Read-only filesystem (Vercel) — try Redis
    if (hasRedis()) {
      await getRedis().set(SELF_HOSTED_REDIS_KEY, settings);
      return;
    }
  }
}

/**
 * Check if a user is admin.
 * - Self-hosted: first user to configure becomes admin, or matches INTERTOOL_ADMIN env var
 * - SaaS: the user who created the org is admin
 */
export async function isAdmin(username: string, orgSlug?: string): Promise<boolean> {
  const settings = await getSettings(orgSlug);
  if (!settings) return true; // no settings yet = anyone can set up
  if (!settings.admin_username) return true; // env-var config with no admin set
  if (settings.admin_username.toLowerCase() === username.toLowerCase()) return true;
  // For Google-authed admins: check admin_email too
  if (settings.admin_email && settings.admin_email.toLowerCase() === username.toLowerCase()) return true;
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
  const githubSecret = settings?.github_client_secret || process.env.GITHUB_SECRET;
  const googleId = settings?.google_client_id || process.env.GOOGLE_CLIENT_ID;
  const googleSecret = settings?.google_client_secret || process.env.GOOGLE_CLIENT_SECRET;

  return {
    github: githubId && githubSecret ? { clientId: githubId, clientSecret: githubSecret } : null,
    google: googleId && googleSecret ? { clientId: googleId, clientSecret: googleSecret } : null,
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
  const exists = await getRedis().exists(kvKey(orgSlug));
  return exists === 1;
}

/** Register a new org (SaaS mode) */
export async function createOrg(orgSlug: string, orgName: string, adminUsername: string): Promise<void> {
  if (!isSaasMode()) return;
  const existing = await getRedis().exists(kvKey(orgSlug));
  if (existing) throw new Error(`Organization "${orgSlug}" already exists`);

  const settings: RegistrySettings = {
    admin_username: adminUsername,
    configured_at: new Date().toISOString(),
    s3_bucket: "",
    s3_region: "us-east-1",
    s3_access_key_id: "",
    s3_secret_access_key: "",
    org_slug: orgSlug,
    org_name: orgName,
  };
  await getRedis().set(kvKey(orgSlug), settings);
  await getRedis().set(`user:${adminUsername}:org`, orgSlug);
}

/** Get the org slug for a user (SaaS mode) */
export async function getOrgForUser(username: string): Promise<string | null> {
  if (!isSaasMode()) return null;
  return await getRedis().get<string>(`user:${username}:org`);
}

// ── Org membership helpers (SaaS mode) ──

function memberSetKey(orgSlug: string): string {
  return `org:${orgSlug}:members`;
}

/** Add a user to an org's membership set */
export async function addOrgMember(orgSlug: string, username: string): Promise<void> {
  await getRedis().sadd(memberSetKey(orgSlug), username.toLowerCase());
}

/** Remove a user from an org's membership set */
export async function removeOrgMember(orgSlug: string, username: string): Promise<void> {
  await getRedis().srem(memberSetKey(orgSlug), username.toLowerCase());
}

/** Check if a user is a member of an org (also returns true for admin) */
export async function isOrgMember(orgSlug: string, username: string): Promise<boolean> {
  const settings = await getSettings(orgSlug);
  if (settings?.admin_username?.toLowerCase() === username.toLowerCase()) return true;
  const result = await getRedis().sismember(memberSetKey(orgSlug), username.toLowerCase());
  return result === 1;
}

/** Get all members of an org */
export async function getOrgMembers(orgSlug: string): Promise<string[]> {
  return await getRedis().smembers(memberSetKey(orgSlug));
}
