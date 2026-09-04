import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Actor, IntertoolStore } from "@intertool/db";

export interface WebIdentity {
  subject: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  orgSlug?: string;
}

export function signaturePayload(input: {
  method: string;
  url: string;
  subject: string;
  orgSlug?: string;
  timestamp: string;
  email?: string;
  name?: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.url,
    input.subject,
    input.orgSlug ?? "",
    input.timestamp,
    input.email ?? "",
    input.name ?? "",
  ].join("\n");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyWebIdentity(request: FastifyRequest): WebIdentity | null {
  const subject = request.headers["x-intertool-web-subject"];
  const timestamp = request.headers["x-intertool-web-timestamp"];
  const signature = request.headers["x-intertool-web-signature"];
  if (
    typeof subject !== "string" ||
    typeof timestamp !== "string" ||
    typeof signature !== "string"
  ) {
    return null;
  }
  const parsedTimestamp = Number(timestamp);
  if (
    !Number.isFinite(parsedTimestamp) ||
    Math.abs(Date.now() - parsedTimestamp) > 5 * 60_000
  ) {
    return null;
  }
  const orgSlug =
    typeof request.headers["x-intertool-web-org"] === "string"
      ? request.headers["x-intertool-web-org"]
      : undefined;
  const email =
    typeof request.headers["x-intertool-web-email"] === "string"
      ? request.headers["x-intertool-web-email"]
      : undefined;
  const name =
    typeof request.headers["x-intertool-web-name"] === "string"
      ? request.headers["x-intertool-web-name"]
      : undefined;
  const secret = process.env.WEB_INTERNAL_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(
      signaturePayload({
        method: request.method,
        url: request.url,
        subject,
        orgSlug,
        timestamp,
        email,
        name,
      })
    )
    .digest("hex");
  if (!safeEqual(signature, expected)) return null;
  return { subject, orgSlug, email, name };
}

export async function authenticateRequest(
  request: FastifyRequest,
  store: IntertoolStore
): Promise<Actor | null> {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return store.authenticateToken(authorization.slice(7));
  }
  const identity = verifyWebIdentity(request);
  if (identity)
    return store.authenticateInternal(identity.subject, identity.orgSlug);

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true" &&
    typeof request.headers["x-intertool-dev-user"] === "string"
  ) {
    return store.authenticateInternal(
      request.headers["x-intertool-dev-user"],
      typeof request.headers["x-intertool-dev-org"] === "string"
        ? request.headers["x-intertool-dev-org"]
        : undefined
    );
  }
  return null;
}
