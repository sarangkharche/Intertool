import { Redis } from "@upstash/redis";
import { isSaasMode } from "./org";
import type { OrgRole, OrgUser, Permission, ApiToken } from "./types";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ── Permission matrix ──

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "skill:publish", "skill:edit_own", "skill:delete_own",
    "skill:edit_any", "skill:delete_any",
    "members:invite", "members:remove", "members:change_role",
    "settings:manage", "org:transfer_ownership",
    "tokens:manage_own", "tokens:manage_any",
  ],
  admin: [
    "skill:publish", "skill:edit_own", "skill:delete_own",
    "skill:edit_any", "skill:delete_any",
    "members:invite", "members:remove", "members:change_role",
    "settings:manage",
    "tokens:manage_own", "tokens:manage_any",
  ],
  member: [
    "skill:publish", "skill:edit_own", "skill:delete_own",
    "tokens:manage_own",
  ],
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ── Redis access ──

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ── Self-hosted JSON fallback ──

const SETTINGS_PATH = path.resolve(process.cwd(), "registry", "settings.json");

interface SelfHostedData {
  users?: Record<string, OrgUser>;
  api_tokens?: Record<string, ApiToken>;
}

function readSelfHostedData(): SelfHostedData {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    return { users: raw.users, api_tokens: raw.api_tokens };
  } catch {
    return {};
  }
}

function writeSelfHostedData(data: SelfHostedData): void {
  try {
    const raw = fs.existsSync(SETTINGS_PATH)
      ? JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"))
      : {};
    if (data.users !== undefined) raw.users = data.users;
    if (data.api_tokens !== undefined) raw.api_tokens = data.api_tokens;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(raw, null, 2) + "\n");
  } catch {
    // Read-only filesystem (Vercel) - try Redis
    const r = getRedis();
    if (r) {
      // Fire-and-forget write to Redis for self-hosted on Vercel
      r.set("self-hosted:rbac", data).catch(() => {});
    }
  }
}

async function readSelfHostedDataAsync(): Promise<SelfHostedData> {
  // Try filesystem first
  const fromFile = readSelfHostedData();
  if (fromFile.users) return fromFile;

  // Fall back to Redis
  const r = getRedis();
  if (r) {
    const data = await r.get<SelfHostedData>("self-hosted:rbac");
    if (data) return data;
  }
  return {};
}

// ── Redis key helpers ──

function userKey(orgSlug: string | undefined, id: string): string {
  const prefix = orgSlug ?? "default";
  return `user:${prefix}:${id.toLowerCase()}`;
}

function tokenKey(hash: string): string {
  return `token:${hash}`;
}

function userTokensKey(orgSlug: string | undefined, id: string): string {
  const prefix = orgSlug ?? "default";
  return `user:${prefix}:${id.toLowerCase()}:tokens`;
}

// ── Core RBAC functions ──

export async function getUserRole(
  identifier: string,
  orgSlug?: string
): Promise<OrgRole | null> {
  const id = identifier.toLowerCase();

  const r = getRedis();
  if (r) {
    // Check migration
    await ensureMigrated(orgSlug);
    const role = await r.hget<OrgRole>(userKey(orgSlug, id), "role");
    return role ?? null;
  }

  // Self-hosted without Redis
  const data = await readSelfHostedDataAsync();
  return data.users?.[id]?.role ?? null;
}

export async function setUserRole(
  identifier: string,
  role: OrgRole,
  orgSlug?: string
): Promise<void> {
  const id = identifier.toLowerCase();

  const r = getRedis();
  if (r) {
    await r.hset(userKey(orgSlug, id), { role });
    return;
  }

  // Self-hosted
  const data = await readSelfHostedDataAsync();
  if (!data.users) data.users = {};
  if (data.users[id]) {
    data.users[id].role = role;
  }
  writeSelfHostedData(data);
}

/**
 * Determine the initial role for a new user.
 * If they match the configured admin_username or admin_email, they get "owner".
 * Otherwise, "member".
 */
async function resolveInitialRole(id: string, orgSlug?: string): Promise<OrgRole> {
  try {
    const { getSettings } = await import("./settings");
    const settings = await getSettings(orgSlug);
    if (!settings) return "member";
    if (settings.admin_username?.toLowerCase() === id) return "owner";
    if (settings.admin_email?.toLowerCase() === id) return "owner";
  } catch {
    // settings unavailable
  }
  return "member";
}

export async function ensureUserRecord(
  identifier: string,
  profile: {
    display_name: string;
    provider: "github" | "google";
    avatar_url?: string;
  },
  orgSlug?: string
): Promise<OrgUser> {
  const id = identifier.toLowerCase();
  const now = new Date().toISOString();

  const r = getRedis();
  if (r) {
    await ensureMigrated(orgSlug);
    const existing = await r.hgetall(userKey(orgSlug, id));

    if (existing && existing.role) {
      // Update last_seen_at and profile info, preserve role
      await r.hset(userKey(orgSlug, id), {
        last_seen_at: now,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url ?? "",
        provider: profile.provider,
      });
      return { ...existing, last_seen_at: now, display_name: profile.display_name } as OrgUser;
    }

    // New user - determine role based on admin settings
    const role = await resolveInitialRole(id, orgSlug);
    const user: OrgUser = {
      id,
      role,
      display_name: profile.display_name,
      provider: profile.provider,
      avatar_url: profile.avatar_url,
      joined_at: now,
      last_seen_at: now,
    };
    await r.hset(userKey(orgSlug, id), user as unknown as Record<string, string>);
    return user;
  }

  // Self-hosted
  const data = await readSelfHostedDataAsync();
  if (!data.users) data.users = {};

  if (data.users[id]) {
    data.users[id].last_seen_at = now;
    data.users[id].display_name = profile.display_name;
    data.users[id].avatar_url = profile.avatar_url;
    writeSelfHostedData(data);
    return data.users[id];
  }

  // Determine role: if this user is the configured admin, make them owner
  const role = await resolveInitialRole(id, orgSlug);

  const user: OrgUser = {
    id,
    role,
    display_name: profile.display_name,
    provider: profile.provider,
    avatar_url: profile.avatar_url,
    joined_at: now,
    last_seen_at: now,
  };
  data.users[id] = user;
  writeSelfHostedData(data);
  return user;
}

export async function authorize(
  identifier: string,
  permission: Permission,
  orgSlug?: string
): Promise<{ allowed: boolean; role: OrgRole | null }> {
  const role = await getUserRole(identifier, orgSlug);
  if (!role) return { allowed: false, role: null };
  return { allowed: hasPermission(role, permission), role };
}

export async function listMembers(orgSlug?: string): Promise<OrgUser[]> {
  const r = getRedis();
  if (r) {
    await ensureMigrated(orgSlug);
    const prefix = orgSlug ?? "default";
    const pattern = `user:${prefix}:*`;

    // Scan for user keys (exclude token sets)
    const members: OrgUser[] = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await r.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      for (const key of keys) {
        if (key.endsWith(":tokens")) continue; // skip token set keys
        const user = await r.hgetall(key);
        if (user && user.role) members.push(user as unknown as OrgUser);
      }
    } while (cursor !== 0);

    return members.sort((a, b) => {
      const order: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2 };
      return order[a.role] - order[b.role];
    });
  }

  // Self-hosted
  const data = await readSelfHostedDataAsync();
  return Object.values(data.users ?? {}).sort((a, b) => {
    const order: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });
}

export async function removeMember(
  identifier: string,
  orgSlug?: string
): Promise<void> {
  const id = identifier.toLowerCase();

  const r = getRedis();
  if (r) {
    // Remove user record
    await r.del(userKey(orgSlug, id));
    // Remove their tokens
    const tokenHashes = await r.smembers(userTokensKey(orgSlug, id));
    if (tokenHashes.length > 0) {
      await r.del(...tokenHashes.map(h => tokenKey(h)));
    }
    await r.del(userTokensKey(orgSlug, id));
    // Remove from legacy member set
    if (orgSlug) {
      await r.srem(`org:${orgSlug}:members`, id);
    }
    return;
  }

  // Self-hosted
  const data = await readSelfHostedDataAsync();
  if (data.users) delete data.users[id];
  // Remove associated tokens
  if (data.api_tokens) {
    for (const [hash, token] of Object.entries(data.api_tokens)) {
      if (token.user_id === id) delete data.api_tokens[hash];
    }
  }
  writeSelfHostedData(data);
}

// ── API Token functions ──

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): string {
  const bytes = crypto.randomBytes(32);
  // Base62 encoding
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "itk_";
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}

export async function createApiToken(
  userId: string,
  label: string,
  orgSlug?: string
): Promise<{ raw: string; token: ApiToken }> {
  const raw = generateToken();
  const hash = hashToken(raw);
  const id = userId.toLowerCase();

  const apiToken: ApiToken = {
    hash,
    user_id: id,
    org_slug: orgSlug,
    label,
    created_at: new Date().toISOString(),
  };

  const r = getRedis();
  if (r) {
    await r.hset(tokenKey(hash), apiToken as unknown as Record<string, string>);
    await r.sadd(userTokensKey(orgSlug, id), hash);
  } else {
    const data = await readSelfHostedDataAsync();
    if (!data.api_tokens) data.api_tokens = {};
    data.api_tokens[hash] = apiToken;
    writeSelfHostedData(data);
  }

  return { raw, token: apiToken };
}

export async function lookupToken(raw: string): Promise<ApiToken | null> {
  const hash = hashToken(raw);

  const r = getRedis();
  if (r) {
    const token = await r.hgetall(tokenKey(hash)) as unknown as ApiToken | null;
    return token && token.user_id ? token : null;
  }

  const data = await readSelfHostedDataAsync();
  return data.api_tokens?.[hash] ?? null;
}

export async function listUserTokens(
  userId: string,
  orgSlug?: string
): Promise<ApiToken[]> {
  const id = userId.toLowerCase();

  const r = getRedis();
  if (r) {
    const hashes = await r.smembers(userTokensKey(orgSlug, id));
    const tokens: ApiToken[] = [];
    for (const hash of hashes) {
      const token = await r.hgetall(tokenKey(hash)) as unknown as ApiToken | null;
      if (token && token.user_id) tokens.push(token);
    }
    return tokens.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const data = await readSelfHostedDataAsync();
  return Object.values(data.api_tokens ?? {})
    .filter(t => t.user_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function revokeToken(
  hash: string,
  orgSlug?: string
): Promise<ApiToken | null> {
  const r = getRedis();
  if (r) {
    const token = await r.hgetall(tokenKey(hash)) as unknown as ApiToken | null;
    if (!token || !token.user_id) return null;
    await r.del(tokenKey(hash));
    await r.srem(userTokensKey(orgSlug, token.user_id), hash);
    return token;
  }

  const data = await readSelfHostedDataAsync();
  const token = data.api_tokens?.[hash];
  if (!token) return null;
  delete data.api_tokens![hash];
  writeSelfHostedData(data);
  return token;
}

// ── Migration ──

// In-memory cache: once migrated per process, skip the Redis check entirely
const _migratedCache = new Set<string>();

async function ensureMigrated(orgSlug?: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const prefix = orgSlug ?? "default";

  // Fast path: already confirmed migrated in this process
  if (_migratedCache.has(prefix)) return;

  const flagKey = `rbac:migrated:${prefix}`;
  const migrated = await r.get(flagKey);
  if (migrated) {
    _migratedCache.add(prefix);
    return;
  }

  // Use SETNX as a distributed lock so only one request runs migration.
  // Key expires after 60s in case the winner crashes mid-migration.
  const lockKey = `rbac:migrating:${prefix}`;
  const acquired = await r.set(lockKey, "1", { nx: true, ex: 60 });
  if (!acquired) {
    // Another request is migrating. Wait briefly, then return.
    // The flag will be set when it finishes; next call will see it.
    return;
  }

  try {
    // Import getSettings dynamically to avoid circular dependency
    const { getSettings } = await import("./settings");
    const settings = await getSettings(orgSlug);

    if (settings?.admin_username) {
      const adminId = settings.admin_username.toLowerCase();
      const existing = await r.hget(userKey(orgSlug, adminId), "role");
      if (!existing) {
        const now = new Date().toISOString();
        const ownerRecord: OrgUser = {
          id: adminId,
          role: "owner",
          display_name: settings.admin_username,
          provider: "github", // best guess from existing data
          joined_at: settings.configured_at || now,
          last_seen_at: now,
        };
        await r.hset(userKey(orgSlug, adminId), ownerRecord as unknown as Record<string, string>);
      }
    }

    // Migrate existing members
    if (orgSlug) {
      const memberSetKey = `org:${orgSlug}:members`;
      const members = await r.smembers(memberSetKey);
      const now = new Date().toISOString();
      for (const member of members) {
        const mid = member.toLowerCase();
        const existing = await r.hget(userKey(orgSlug, mid), "role");
        if (!existing) {
          const memberRecord: OrgUser = {
            id: mid,
            role: "member",
            display_name: member,
            provider: "github",
            joined_at: now,
            last_seen_at: now,
          };
          await r.hset(userKey(orgSlug, mid), memberRecord as unknown as Record<string, string>);
        }
      }
    }

    await r.set(flagKey, "1");
    _migratedCache.add(prefix);
  } finally {
    await r.del(lockKey);
  }

  await r.set(flagKey, "1");
}
