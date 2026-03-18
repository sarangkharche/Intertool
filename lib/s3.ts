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

// ── S3 operations (all take explicit settings) ──

export async function getObject(settings: RegistrySettings, key: string): Promise<string | null> {
  try {
    const res = await buildClient(settings).send(
      new GetObjectCommand({ Bucket: settings.s3_bucket, Key: key })
    );
    return (await res.Body?.transformToString("utf-8")) ?? null;
  } catch (err: unknown) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function putObject(settings: RegistrySettings, key: string, body: string): Promise<void> {
  await buildClient(settings).send(
    new PutObjectCommand({
      Bucket: settings.s3_bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
    })
  );
}

export async function deleteObject(settings: RegistrySettings, key: string): Promise<void> {
  await buildClient(settings).send(
    new DeleteObjectCommand({ Bucket: settings.s3_bucket, Key: key })
  );
}

export async function listObjects(settings: RegistrySettings, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await buildClient(settings).send(
      new ListObjectsV2Command({
        Bucket: settings.s3_bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
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

function isNotFound(err: unknown): boolean {
  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name: string }).name;
    return name === "NoSuchKey" || name === "NotFound";
  }
  return false;
}
