import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type { RegistrySettings } from "./settings";

// ── Client cache (keyed by settings hash) ──

const clientCache = new Map<string, S3Client>();

function settingsHash(s: RegistrySettings): string {
  return `${s.s3_bucket}:${s.s3_region}:${s.s3_access_key_id}:${s.s3_endpoint ?? ""}:${s.s3_session_token ?? ""}`;
}

function buildClient(settings: RegistrySettings): S3Client {
  const hash = settingsHash(settings);
  const cached = clientCache.get(hash);
  if (cached) return cached;

  const credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  } = {
    accessKeyId: settings.s3_access_key_id,
    secretAccessKey: settings.s3_secret_access_key,
  };
  if (settings.s3_session_token) {
    credentials.sessionToken = settings.s3_session_token;
  }

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: settings.s3_region || "us-east-1",
    credentials,
  };

  if (settings.s3_endpoint) {
    config.endpoint = settings.s3_endpoint;
    config.forcePathStyle = true; // needed for MinIO, R2, etc.
  }

  const client = new S3Client(config);
  clientCache.set(hash, client);
  return client;
}

// ── Check if settings have S3 configured ──

export function isS3Configured(settings: RegistrySettings | null): boolean {
  return !!(settings?.s3_bucket && settings?.s3_access_key_id && settings?.s3_secret_access_key);
}

// ── ETag cache with LRU eviction ──

interface CacheEntry {
  etag: string;
  body: string;
  accessedAt: number;
}

const MAX_CACHE_ENTRIES = 500;
const etagCache = new Map<string, CacheEntry>();

function cacheKey(bucket: string, key: string): string {
  return `${bucket}:${key}`;
}

function setCacheEntry(k: string, etag: string, body: string): void {
  etagCache.set(k, { etag, body, accessedAt: Date.now() });

  if (etagCache.size > MAX_CACHE_ENTRIES) {
    // Evict oldest 20%
    const entries = [...etagCache.entries()].sort((a, b) => a[1].accessedAt - b[1].accessedAt);
    const evictCount = Math.floor(MAX_CACHE_ENTRIES * 0.2);
    for (let i = 0; i < evictCount; i++) {
      etagCache.delete(entries[i][0]);
    }
  }
}

function getCacheEntry(k: string): CacheEntry | undefined {
  const entry = etagCache.get(k);
  if (entry) entry.accessedAt = Date.now();
  return entry;
}

// ── In-flight dedup ──

const inflight = new Map<string, Promise<string | null>>();

// ── S3 operations (all take explicit settings) ──

export async function getObject(settings: RegistrySettings, key: string): Promise<string | null> {
  try {
    return await withRetry(async () => {
      const res = await buildClient(settings).send(
        new GetObjectCommand({ Bucket: settings.s3_bucket, Key: key })
      );
      const body = (await res.Body?.transformToString("utf-8")) ?? null;
      if (body && res.ETag) {
        setCacheEntry(cacheKey(settings.s3_bucket, key), res.ETag, body);
      }
      return body;
    });
  } catch (err: unknown) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Fetch an object only if it changed since last fetch (ETag-based).
 * - 304 Not Modified → returns cached body (no transfer)
 * - 200 → returns fresh body, updates cache
 * - Not found → returns null
 * - Network error → returns cached body if available, otherwise throws
 * - Deduplicates concurrent requests for the same key
 */
export async function getObjectIfChanged(settings: RegistrySettings, key: string): Promise<string | null> {
  const ck = cacheKey(settings.s3_bucket, key);

  // Deduplicate concurrent requests for the same key
  const existing = inflight.get(ck);
  if (existing) return existing;

  const promise = _getObjectIfChanged(settings, key, ck);
  inflight.set(ck, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(ck);
  }
}

async function _getObjectIfChanged(settings: RegistrySettings, key: string, ck: string): Promise<string | null> {
  const cached = getCacheEntry(ck);

  try {
    const cmd = new GetObjectCommand({
      Bucket: settings.s3_bucket,
      Key: key,
      ...(cached ? { IfNoneMatch: cached.etag } : {}),
    });

    const res = await buildClient(settings).send(cmd);
    const body = (await res.Body?.transformToString("utf-8")) ?? null;
    if (body && res.ETag) {
      setCacheEntry(ck, res.ETag, body);
    }
    return body;
  } catch (err: unknown) {
    // 304 Not Modified — content unchanged, return cached
    if (isNotModified(err) && cached) return cached.body;

    // Not found — object was deleted
    if (isNotFound(err)) {
      etagCache.delete(ck);
      return null;
    }

    // Network/server error — return stale cache if we have it
    if (cached && isTransientError(err)) {
      return cached.body;
    }

    throw err;
  }
}

export async function putObject(settings: RegistrySettings, key: string, body: string): Promise<void> {
  await withRetry(() =>
    buildClient(settings).send(
      new PutObjectCommand({
        Bucket: settings.s3_bucket,
        Key: key,
        Body: body,
        ContentType: "application/json",
      })
    )
  );
  // Invalidate cached ETag so next read fetches fresh
  etagCache.delete(cacheKey(settings.s3_bucket, key));
}

export async function deleteObject(settings: RegistrySettings, key: string): Promise<void> {
  await withRetry(() =>
    buildClient(settings).send(
      new DeleteObjectCommand({ Bucket: settings.s3_bucket, Key: key })
    )
  );
  etagCache.delete(cacheKey(settings.s3_bucket, key));
}

export async function listObjects(settings: RegistrySettings, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await withRetry(() =>
      buildClient(settings).send(
        new ListObjectsV2Command({
          Bucket: settings.s3_bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      )
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

/** Test connectivity by checking if the bucket exists */
export async function testConnection(settings: RegistrySettings): Promise<{ ok: boolean; error?: string }> {
  try {
    await buildClient(settings).send(
      new HeadBucketCommand({ Bucket: settings.s3_bucket })
    );
    return { ok: true };
  } catch (err: unknown) {
    // Extract meaningful error from AWS SDK errors
    const awsErr = err as { name?: string; Code?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    const code = awsErr.name || awsErr.Code || "";
    const status = awsErr.$metadata?.httpStatusCode;
    let message = awsErr.message || "Connection failed";

    if (code === "403" || status === 403) {
      message = "Access denied — check your credentials and bucket permissions";
    } else if (code === "NotFound" || status === 404) {
      message = `Bucket "${settings.s3_bucket}" not found`;
    } else if (code === "InvalidAccessKeyId") {
      message = "Invalid access key ID";
    } else if (code === "SignatureDoesNotMatch") {
      message = "Invalid secret access key";
    } else if (code === "ExpiredToken") {
      message = "Session token has expired — get fresh credentials";
    }

    return { ok: false, error: message };
  }
}

// ── Error classification ──

function isNotFound(err: unknown): boolean {
  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name: string }).name;
    return name === "NoSuchKey" || name === "NotFound";
  }
  return false;
}

function isNotModified(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string };
    return e.$metadata?.httpStatusCode === 304 || e.name === "304" || e.name === "NotModified";
  }
  return false;
}

function isTransientError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string; code?: string };
    const status = e.$metadata?.httpStatusCode;
    // 5xx = server error, no status = network error
    if (!status || status >= 500) return true;
    if (e.name === "TimeoutError" || e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT") return true;
  }
  return false;
}

const NON_RETRYABLE = new Set([
  "NoSuchKey",
  "NotFound",
  "NotModified",
  "304",
  "AccessDenied",
  "InvalidAccessKeyId",
  "SignatureDoesNotMatch",
  "ExpiredToken",
  "NoSuchBucket",
]);

function isNonRetryable(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name && NON_RETRYABLE.has(e.name)) return true;
    const status = e.$metadata?.httpStatusCode;
    // 304 is not an error — don't retry it
    if (status === 304) return true;
    if (status && status >= 400 && status < 500) return true;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isNonRetryable(err) || attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Unreachable");
}
