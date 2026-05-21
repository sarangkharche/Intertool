import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { isLocalSaasFallbackMode } from "./org";
import type { AuditEvent } from "./types";

const AUDIT_PATH = path.resolve(process.cwd(), "registry", "audit-log.json");
const MAX_AUDIT_EVENTS = 1000;

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (isLocalSaasFallbackMode()) return null;
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

function auditKey(orgSlug?: string): string {
  return `audit:${orgSlug ?? "default"}`;
}

interface LocalAuditData {
  events?: AuditEvent[];
}

function readLocalAuditData(): LocalAuditData {
  try {
    if (!fs.existsSync(AUDIT_PATH)) return {};
    return JSON.parse(fs.readFileSync(AUDIT_PATH, "utf-8")) as LocalAuditData;
  } catch {
    return {};
  }
}

function writeLocalAuditData(data: LocalAuditData): void {
  try {
    const dir = path.dirname(AUDIT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUDIT_PATH, JSON.stringify(data, null, 2) + "\n");
  } catch {
    // Audit logging should not block the user action in read-only deployments.
  }
}

export async function appendAuditEvent(
  event: Omit<AuditEvent, "id" | "created_at"> &
    Partial<Pick<AuditEvent, "id" | "created_at">>
): Promise<AuditEvent> {
  const auditEvent: AuditEvent = {
    ...event,
    id: event.id ?? randomUUID(),
    created_at: event.created_at ?? new Date().toISOString(),
  };

  const r = getRedis();
  if (r) {
    try {
      const key = auditKey(auditEvent.org_slug);
      await r.lpush(key, JSON.stringify(auditEvent));
      await r.ltrim(key, 0, MAX_AUDIT_EVENTS - 1);
      return auditEvent;
    } catch {
      // Fall through to local best-effort storage.
    }
  }

  const data = readLocalAuditData();
  const events = data.events ?? [];
  events.unshift(auditEvent);
  data.events = events.slice(0, MAX_AUDIT_EVENTS);
  writeLocalAuditData(data);
  return auditEvent;
}

export async function listAuditEvents(
  orgSlug?: string,
  limit = 100
): Promise<AuditEvent[]> {
  const safeLimit = Math.max(1, Math.min(limit, MAX_AUDIT_EVENTS));

  const r = getRedis();
  if (r) {
    try {
      const rows = await r.lrange<string>(auditKey(orgSlug), 0, safeLimit - 1);
      return rows
        .map((row) => {
          try {
            return JSON.parse(row) as AuditEvent;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as AuditEvent[];
    } catch {
      // Fall through to local best-effort storage.
    }
  }

  const data = readLocalAuditData();
  return (data.events ?? [])
    .filter((event) => (event.org_slug ?? undefined) === orgSlug)
    .slice(0, safeLimit);
}
