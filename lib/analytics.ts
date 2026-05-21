import { randomUUID } from "node:crypto";
import { getObject, listObjects, putObject } from "./s3";
import type { RegistrySettings } from "./settings";
import { isLocalSaasFallbackMode } from "./org";

let redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (isLocalSaasFallbackMode()) return null;
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({ url, token });
  return redis;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function trackDownload(
  slug: string,
  settings: RegistrySettings | null
): Promise<void> {
  const r = await getRedis();
  if (r) {
    const key = `downloads:${slug}:${todayKey()}`;
    await r.incr(key);
    // Auto-expire daily keys after 90 days
    await r.expire(key, 90 * 86400);
    // Also increment total
    await r.incr(`downloads:${slug}:total`);
    return;
  }

  // Fallback: S3-based analytics
  if (!settings) return;
  try {
    const today = todayKey();
    const analyticsKey = `_analytics/${slug}/${today}/${Date.now()}-${randomUUID()}.json`;
    await putObject(
      settings,
      analyticsKey,
      JSON.stringify({ at: new Date().toISOString() })
    );
  } catch {
    // Non-fatal — don't break the request
  }
}

export interface DownloadStats {
  today: number;
  week: number;
  month: number;
  total: number;
}

export async function getDownloadStats(
  slug: string,
  settings: RegistrySettings | null
): Promise<DownloadStats> {
  const r = await getRedis();
  if (r) {
    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const keys = dates.map((d) => `downloads:${slug}:${d}`);
    const values = await r.mget<(number | null)[]>(...keys);

    const today = values[0] ?? 0;
    const week = values
      .slice(0, 7)
      .reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const month = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const total = (await r.get<number>(`downloads:${slug}:total`)) ?? 0;

    return { today, week, month, total };
  }

  // Fallback: S3-based analytics
  if (!settings) return { today: 0, week: 0, month: 0, total: 0 };

  try {
    const legacyRaw = await getObject(settings, `_analytics/${slug}.json`);
    const legacy = legacyRaw
      ? (JSON.parse(legacyRaw) as Record<string, number>)
      : {};
    const now = new Date();
    let today = 0,
      week = 0,
      month = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const eventKeys = await listObjects(
        settings,
        `_analytics/${slug}/${key}/`
      );
      const count = eventKeys.length + (legacy[key] ?? 0);
      if (i === 0) today = count;
      if (i < 7) week += count;
      month += count;
    }

    const allEventKeys = await listObjects(settings, `_analytics/${slug}/`);
    return {
      today,
      week,
      month,
      total: allEventKeys.length + (legacy["total"] ?? 0),
    };
  } catch {
    return { today: 0, week: 0, month: 0, total: 0 };
  }
}
