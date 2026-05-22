import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import {
  del as blobDel,
  get as blobGet,
  list as blobList,
  put as blobPut,
} from "@vercel/blob";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import type { RegistrySettings } from "./settings";

// ── Client cache (keyed by settings hash) ──

const clientCache = new Map<string, S3Client>();

export function storageCacheScope(s: RegistrySettings): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        driver: storageDriver(s),
        bucket: s.s3_bucket,
        region: s.s3_region || "us-east-1",
        endpoint: s.s3_endpoint ?? "",
        prefix: normalizePrefix(s.s3_prefix),
        accessKeyId: s.s3_access_key_id,
        secretAccessKey: s.s3_secret_access_key,
        sessionToken: s.s3_session_token ?? "",
        blobStoreId: s.blob_store_id ?? process.env.BLOB_STORE_ID ?? "",
        blobToken:
          s.blob_read_write_token ?? process.env.BLOB_READ_WRITE_TOKEN ?? "",
      })
    )
    .digest("hex");
}

function buildClient(settings: RegistrySettings): S3Client {
  const hash = storageCacheScope(settings);
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

// ── Check if settings have storage configured ──

function storageDriver(settings: RegistrySettings): "s3" | "vercel-blob" {
  return settings.storage_driver === "vercel-blob" ? "vercel-blob" : "s3";
}

function blobAccess(settings: RegistrySettings): "private" | "public" {
  return settings.blob_access === "public" ? "public" : "private";
}

function blobAuthOptions(settings: RegistrySettings): {
  token?: string;
  storeId?: string;
} {
  return {
    token: settings.blob_read_write_token ?? process.env.BLOB_READ_WRITE_TOKEN,
    storeId: settings.blob_store_id ?? process.env.BLOB_STORE_ID,
  };
}

async function readBlobStream(stream: ReadableStream<Uint8Array>) {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function blobBody(body: string | Uint8Array): string | Buffer {
  return typeof body === "string" ? body : Buffer.from(body);
}

function hasBlobAuth(settings: RegistrySettings): boolean {
  return !!(
    settings.blob_read_write_token ||
    settings.blob_store_id ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID
  );
}

export function isStorageConfigured(
  settings: RegistrySettings | null
): boolean {
  if (!settings) return false;
  if (storageDriver(settings) === "vercel-blob") return hasBlobAuth(settings);
  return !!(
    settings.s3_bucket &&
    settings.s3_access_key_id &&
    settings.s3_secret_access_key
  );
}

export function isS3Configured(settings: RegistrySettings | null): boolean {
  return isStorageConfigured(settings);
}

// ── ETag cache with LRU eviction ──

interface CacheEntry {
  etag: string;
  body: string;
  accessedAt: number;
}

const MAX_CACHE_ENTRIES = 500;
const etagCache = new Map<string, CacheEntry>();

function cacheKey(settings: RegistrySettings, key: string): string {
  return `${storageCacheScope(settings)}:${key}`;
}

function normalizePrefix(prefix?: string): string {
  return (prefix ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function objectKey(settings: RegistrySettings, key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  const prefix = normalizePrefix(settings.s3_prefix);
  return prefix ? `${prefix}/${cleanKey}` : cleanKey;
}

function stripObjectKey(settings: RegistrySettings, key: string): string {
  const prefix = normalizePrefix(settings.s3_prefix);
  if (!prefix) return key;

  const fullPrefix = `${prefix}/`;
  return key.startsWith(fullPrefix) ? key.slice(fullPrefix.length) : key;
}

function setCacheEntry(k: string, etag: string, body: string): void {
  etagCache.set(k, { etag, body, accessedAt: Date.now() });

  if (etagCache.size > MAX_CACHE_ENTRIES) {
    // Evict oldest 20%
    const entries = [...etagCache.entries()].sort(
      (a, b) => a[1].accessedAt - b[1].accessedAt
    );
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

export async function getObject(
  settings: RegistrySettings,
  key: string
): Promise<string | null> {
  if (storageDriver(settings) === "vercel-blob") {
    try {
      const res = await blobGet(objectKey(settings, key), {
        access: blobAccess(settings),
        useCache: false,
        ...blobAuthOptions(settings),
      });
      if (!res || res.statusCode === 304 || !res.stream) return null;
      const body = await new Response(res.stream).text();
      setCacheEntry(cacheKey(settings, key), res.blob.etag, body);
      return body;
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  try {
    return await withRetry(async () => {
      const res = await buildClient(settings).send(
        new GetObjectCommand({
          Bucket: settings.s3_bucket,
          Key: objectKey(settings, key),
        })
      );
      const body = (await res.Body?.transformToString("utf-8")) ?? null;
      if (body && res.ETag) {
        setCacheEntry(cacheKey(settings, key), res.ETag, body);
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
export async function getObjectIfChanged(
  settings: RegistrySettings,
  key: string
): Promise<string | null> {
  const ck = cacheKey(settings, key);

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

async function _getObjectIfChanged(
  settings: RegistrySettings,
  key: string,
  ck: string
): Promise<string | null> {
  const cached = getCacheEntry(ck);

  if (storageDriver(settings) === "vercel-blob") {
    try {
      const res = await blobGet(objectKey(settings, key), {
        access: blobAccess(settings),
        useCache: false,
        ...(cached ? { ifNoneMatch: cached.etag } : {}),
        ...blobAuthOptions(settings),
      });
      if (!res) {
        etagCache.delete(ck);
        return null;
      }
      if (res.statusCode === 304) return cached?.body ?? null;
      const body = await new Response(res.stream).text();
      setCacheEntry(ck, res.blob.etag, body);
      return body;
    } catch (err: unknown) {
      if (isNotFound(err)) {
        etagCache.delete(ck);
        return null;
      }
      if (cached && isTransientError(err)) return cached.body;
      throw err;
    }
  }

  try {
    const cmd = new GetObjectCommand({
      Bucket: settings.s3_bucket,
      Key: objectKey(settings, key),
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

export async function putObject(
  settings: RegistrySettings,
  key: string,
  body: string | Uint8Array,
  contentType = "application/json"
): Promise<void> {
  if (storageDriver(settings) === "vercel-blob") {
    await withRetry(() =>
      blobPut(objectKey(settings, key), blobBody(body), {
        access: blobAccess(settings),
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType,
        cacheControlMaxAge: 60,
        ...blobAuthOptions(settings),
      })
    );
    etagCache.delete(cacheKey(settings, key));
    return;
  }

  await withRetry(() =>
    buildClient(settings).send(
      new PutObjectCommand({
        Bucket: settings.s3_bucket,
        Key: objectKey(settings, key),
        Body: body,
        ContentType: contentType,
      })
    )
  );
  // Invalidate cached ETag so next read fetches fresh
  etagCache.delete(cacheKey(settings, key));
}

export async function getObjectBytes(
  settings: RegistrySettings,
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (storageDriver(settings) === "vercel-blob") {
    try {
      const res = await blobGet(objectKey(settings, key), {
        access: blobAccess(settings),
        useCache: false,
        ...blobAuthOptions(settings),
      });
      if (!res || res.statusCode === 304 || !res.stream) return null;
      return {
        body: await readBlobStream(res.stream),
        contentType: res.blob.contentType || "application/octet-stream",
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  try {
    return await withRetry(async () => {
      const res = await buildClient(settings).send(
        new GetObjectCommand({
          Bucket: settings.s3_bucket,
          Key: objectKey(settings, key),
        })
      );
      const body = (await res.Body?.transformToByteArray()) ?? null;
      if (!body) return null;
      return {
        body,
        contentType: res.ContentType ?? "application/octet-stream",
      };
    });
  } catch (err: unknown) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function deleteObject(
  settings: RegistrySettings,
  key: string
): Promise<void> {
  if (storageDriver(settings) === "vercel-blob") {
    await withRetry(() =>
      blobDel(objectKey(settings, key), blobAuthOptions(settings))
    );
    etagCache.delete(cacheKey(settings, key));
    return;
  }

  await withRetry(() =>
    buildClient(settings).send(
      new DeleteObjectCommand({
        Bucket: settings.s3_bucket,
        Key: objectKey(settings, key),
      })
    )
  );
  etagCache.delete(cacheKey(settings, key));
}

export async function deleteObjects(
  settings: RegistrySettings,
  keys: string[]
): Promise<void> {
  if (storageDriver(settings) === "vercel-blob") {
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      if (batch.length === 0) continue;
      await withRetry(() =>
        blobDel(
          batch.map((key) => objectKey(settings, key)),
          blobAuthOptions(settings)
        )
      );
      for (const key of batch) {
        etagCache.delete(cacheKey(settings, key));
      }
    }
    return;
  }

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (batch.length === 0) continue;
    await withRetry(() =>
      buildClient(settings).send(
        new DeleteObjectsCommand({
          Bucket: settings.s3_bucket,
          Delete: {
            Objects: batch.map((key) => ({
              Key: objectKey(settings, key),
            })),
            Quiet: true,
          },
        })
      )
    );
    for (const key of batch) {
      etagCache.delete(cacheKey(settings, key));
    }
  }
}

export async function listObjects(
  settings: RegistrySettings,
  prefix: string
): Promise<string[]> {
  const keys: string[] = [];

  if (storageDriver(settings) === "vercel-blob") {
    let cursor: string | undefined;
    do {
      const res = await withRetry(() =>
        blobList({
          prefix: objectKey(settings, prefix),
          cursor,
          limit: 1000,
          ...blobAuthOptions(settings),
        })
      );
      keys.push(
        ...res.blobs.map((blob) => stripObjectKey(settings, blob.pathname))
      );
      cursor = res.cursor;
    } while (cursor);
    return keys;
  }

  let continuationToken: string | undefined;

  do {
    const res = await withRetry(() =>
      buildClient(settings).send(
        new ListObjectsV2Command({
          Bucket: settings.s3_bucket,
          Prefix: objectKey(settings, prefix),
          ContinuationToken: continuationToken,
        })
      )
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(stripObjectKey(settings, obj.Key));
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

/** Test connectivity by checking if the bucket exists */
export async function testConnection(
  settings: RegistrySettings
): Promise<{ ok: boolean; error?: string }> {
  if (storageDriver(settings) === "vercel-blob") {
    const probeKey = `.intertool-connection-check-${Date.now()}.txt`;
    try {
      await blobPut(objectKey(settings, probeKey), "ok", {
        access: blobAccess(settings),
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "text/plain",
        cacheControlMaxAge: 60,
        ...blobAuthOptions(settings),
      });
      await blobDel(objectKey(settings, probeKey), blobAuthOptions(settings));
      return { ok: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Vercel Blob connection failed";
      return { ok: false, error: message };
    }
  }

  try {
    await buildClient(settings).send(
      new HeadBucketCommand({ Bucket: settings.s3_bucket })
    );
    return { ok: true };
  } catch (err: unknown) {
    // Extract meaningful error from AWS SDK errors
    const awsErr = err as {
      name?: string;
      Code?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
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
    return (
      name === "NoSuchKey" ||
      name === "NotFound" ||
      name === "BlobNotFoundError"
    );
  }
  return false;
}

function isNotModified(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string };
    return (
      e.$metadata?.httpStatusCode === 304 ||
      e.name === "304" ||
      e.name === "NotModified"
    );
  }
  return false;
}

function isTransientError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as {
      $metadata?: { httpStatusCode?: number };
      name?: string;
      code?: string;
    };
    const status = e.$metadata?.httpStatusCode;
    // 5xx = server error, no status = network error
    if (!status || status >= 500) return true;
    if (
      e.name === "TimeoutError" ||
      e.code === "ECONNREFUSED" ||
      e.code === "ETIMEDOUT"
    )
      return true;
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
  "BlobAccessError",
  "BlobNotFoundError",
  "BlobStoreNotFoundError",
  "BlobStoreSuspendedError",
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
