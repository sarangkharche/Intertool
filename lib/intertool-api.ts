import "server-only";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";

interface SessionIdentity {
  subject: string;
  email?: string;
  name?: string;
  orgSlug?: string;
}

function signingSecret(): string {
  const secret = process.env.WEB_INTERNAL_SECRET || process.env.AUTH_SECRET;
  if (!secret)
    throw new Error("WEB_INTERNAL_SECRET or AUTH_SECRET is required");
  return secret;
}

function payload(input: {
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

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const session = await auth();
  if (!session?.user) return null;
  const subject =
    (session.user as { username?: string }).username ||
    session.user.email ||
    session.user.name;
  if (!subject) return null;
  return {
    subject,
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
    orgSlug: await getOrgSlug(),
  };
}

export function signedWebHeaders(
  identity: SessionIdentity,
  method: string,
  url: string
): Headers {
  const timestamp = String(Date.now());
  const signature = crypto
    .createHmac("sha256", signingSecret())
    .update(payload({ method, url, timestamp, ...identity }))
    .digest("hex");
  const headers = new Headers({
    "x-intertool-web-subject": identity.subject,
    "x-intertool-web-timestamp": timestamp,
    "x-intertool-web-signature": signature,
  });
  if (identity.email) headers.set("x-intertool-web-email", identity.email);
  if (identity.name) headers.set("x-intertool-web-name", identity.name);
  if (identity.orgSlug) headers.set("x-intertool-web-org", identity.orgSlug);
  return headers;
}

export async function intertoolApi<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const identity = await getSessionIdentity();
  if (!identity) throw new Error("Unauthorized");
  const method = (init.method ?? "GET").toUpperCase();
  const url = path.startsWith("/api/")
    ? path
    : `/api/${path.replace(/^\//, "")}`;
  const headers = signedWebHeaders(identity, method, url);
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetch(
    `${process.env.SERVER_URL ?? "http://127.0.0.1:3001"}${url}`,
    {
      ...init,
      method,
      headers,
      cache: "no-store",
    }
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const error = new Error(
      body?.error?.message ?? `Intertool API returned ${response.status}`
    );
    Object.assign(error, { status: response.status });
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
