import { headers } from "next/headers";
import { isUsableOrgSlug } from "./org-slugs";

const ORG_COOKIE = "intertool.org";

/**
 * Returns true if running in SaaS mode.
 * Set INTERTOOL_MODE=saas in env to enable multi-tenant mode.
 */
export function isSaasMode(): boolean {
  return process.env.INTERTOOL_MODE === "saas";
}

/**
 * Development-only fallback for exercising SaaS org flows without remote Redis.
 * Production must fail fast when Redis is unavailable.
 */
export function isLocalSaasFallbackMode(): boolean {
  return (
    isSaasMode() &&
    process.env.NODE_ENV !== "production" &&
    process.env.INTERTOOL_LOCAL_SAAS_FALLBACK === "true"
  );
}

function readCookie(
  cookieHeader: string | null,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return undefined;
}

/**
 * Get the org slug for the current request.
 * - SaaS mode: reads x-org-slug set by proxy.ts for /{org} routes.
 * - API calls without a path prefix fall back to the active org cookie.
 * - Self-hosted mode: returns undefined (single tenant)
 */
export async function getOrgSlug(): Promise<string | undefined> {
  if (!isSaasMode()) return undefined;

  try {
    const h = await headers();
    const headerOrgSlug = h.get("x-org-slug");
    if (isUsableOrgSlug(headerOrgSlug)) return headerOrgSlug;

    const cookieOrgSlug = readCookie(h.get("cookie"), ORG_COOKIE);
    return isUsableOrgSlug(cookieOrgSlug) ? cookieOrgSlug : undefined;
  } catch {
    // Not in a request context (build time, etc.)
    return undefined;
  }
}
