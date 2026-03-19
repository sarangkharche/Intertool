import { NextResponse } from "next/server";

let redis: import("@upstash/redis").Redis | null = null;

async function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({ url, token });
  return redis;
}

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const r = await getRedis();
  if (!r) {
    // No Redis configured — allow all requests
    return { allowed: true, remaining: config.limit, resetAt: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;
  const redisKey = `rl:${key}`;

  // Sliding window: add current timestamp, trim old entries, count
  const pipe = r.pipeline();
  pipe.zadd(redisKey, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
  pipe.zremrangebyscore(redisKey, 0, windowStart);
  pipe.zcard(redisKey);
  pipe.expire(redisKey, config.windowSeconds);
  const results = await pipe.exec();

  const count = (results[2] as number) ?? 0;
  const remaining = Math.max(0, config.limit - count);
  const resetAt = now + config.windowSeconds;

  return {
    allowed: count < config.limit,
    remaining,
    resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Rate limit exceeded", status: 429 },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(result.resetAt - Math.floor(Date.now() / 1000)),
      },
    }
  );
}
