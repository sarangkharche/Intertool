import { Redis } from "@upstash/redis";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Invitation, OrgRole } from "./types";
import { ensureUserRecord } from "./rbac";

const INVITE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

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

// ── Key helpers ──

function tokenKey(token: string): string {
  return `invite:${token}`;
}

function emailKey(orgSlug: string | undefined, email: string): string {
  const prefix = orgSlug ?? "default";
  return `invite:email:${prefix}:${email.toLowerCase()}`;
}

// ── Token generation ──

function generateInviteToken(): string {
  const bytes = crypto.randomBytes(32);
  return "inv_" + bytes.toString("base64url");
}

// ── Self-hosted JSON fallback ──

const SETTINGS_PATH = path.resolve(process.cwd(), "registry", "settings.json");

interface SelfHostedInvitations {
  invitations?: Record<string, Invitation>;
}

function readSelfHostedInvitations(): SelfHostedInvitations {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    return { invitations: raw.invitations };
  } catch {
    return {};
  }
}

function writeSelfHostedInvitations(invitations: Record<string, Invitation>): void {
  try {
    const raw = fs.existsSync(SETTINGS_PATH)
      ? JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"))
      : {};
    raw.invitations = invitations;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(raw, null, 2) + "\n");
  } catch {
    // Read-only filesystem, silently fail
  }
}

function filterExpired(invitations: Record<string, Invitation>): Record<string, Invitation> {
  const now = Date.now();
  const filtered: Record<string, Invitation> = {};
  for (const [k, v] of Object.entries(invitations)) {
    if (new Date(v.expires_at).getTime() > now) {
      filtered[k] = v;
    }
  }
  return filtered;
}

// ── Core functions ──

export async function createInvitation(
  email: string,
  role: OrgRole,
  invitedBy: string,
  orgSlug?: string,
): Promise<Invitation> {
  const token = generateInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL * 1000);

  const invitation: Invitation = {
    token,
    email: email.toLowerCase(),
    role,
    invited_by: invitedBy,
    org_slug: orgSlug,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const r = getRedis();
  if (r) {
    await r.set(tokenKey(token), invitation, { ex: INVITE_TTL });
    await r.set(emailKey(orgSlug, email), token, { ex: INVITE_TTL });
    return invitation;
  }

  // Self-hosted JSON fallback
  const data = readSelfHostedInvitations();
  const invitations = filterExpired(data.invitations ?? {});
  invitations[token] = invitation;
  writeSelfHostedInvitations(invitations);
  return invitation;
}

export async function getInvitation(token: string): Promise<Invitation | null> {
  const r = getRedis();
  if (r) {
    const inv = await r.get<Invitation>(tokenKey(token));
    return inv ?? null;
  }

  const data = readSelfHostedInvitations();
  const invitations = filterExpired(data.invitations ?? {});
  return invitations[token] ?? null;
}

export async function getInvitationByEmail(
  email: string,
  orgSlug?: string,
): Promise<Invitation | null> {
  const r = getRedis();
  if (r) {
    const token = await r.get<string>(emailKey(orgSlug, email));
    if (!token) return null;
    return getInvitation(token);
  }

  // Self-hosted: scan all invitations
  const data = readSelfHostedInvitations();
  const invitations = filterExpired(data.invitations ?? {});
  const emailLower = email.toLowerCase();
  for (const inv of Object.values(invitations)) {
    if (inv.email === emailLower && inv.org_slug === orgSlug) {
      return inv;
    }
  }
  return null;
}

export async function listPendingInvitations(orgSlug?: string): Promise<Invitation[]> {
  const r = getRedis();
  if (r) {
    const prefix = orgSlug ?? "default";
    const pattern = `invite:email:${prefix}:*`;
    const invitations: Invitation[] = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await r.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      for (const key of keys) {
        const token = await r.get<string>(key);
        if (token) {
          const inv = await r.get<Invitation>(tokenKey(token));
          if (inv) invitations.push(inv);
        }
      }
    } while (cursor !== 0);
    return invitations.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // Self-hosted
  const data = readSelfHostedInvitations();
  const invitations = filterExpired(data.invitations ?? {});
  return Object.values(invitations)
    .filter((inv) => inv.org_slug === orgSlug)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function acceptInvitation(
  token: string,
  profile?: { display_name: string; provider: "github" | "google"; avatar_url?: string },
): Promise<Invitation | null> {
  const inv = await getInvitation(token);
  if (!inv) return null;

  // Create user record with the invited role
  const userProfile = profile ?? {
    display_name: inv.email,
    provider: "google" as const,
  };
  const user = await ensureUserRecord(inv.email, userProfile, inv.org_slug);

  // Set the invited role if different from default
  if (user.role !== inv.role && inv.role !== "owner") {
    const { setUserRole } = await import("./rbac");
    await setUserRole(inv.email, inv.role, inv.org_slug);
  }

  // Clean up invitation keys
  await deleteInvitationKeys(token, inv.email, inv.org_slug);

  return inv;
}

export async function declineInvitation(token: string): Promise<Invitation | null> {
  const inv = await getInvitation(token);
  if (!inv) return null;
  await deleteInvitationKeys(token, inv.email, inv.org_slug);
  return inv;
}

export async function revokeInvitation(token: string): Promise<Invitation | null> {
  return declineInvitation(token); // Same mechanics
}

// ── Helpers ──

async function deleteInvitationKeys(
  token: string,
  email: string,
  orgSlug?: string,
): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(tokenKey(token));
    await r.del(emailKey(orgSlug, email));
    return;
  }

  // Self-hosted
  const data = readSelfHostedInvitations();
  const invitations = filterExpired(data.invitations ?? {});
  delete invitations[token];
  writeSelfHostedInvitations(invitations);
}
