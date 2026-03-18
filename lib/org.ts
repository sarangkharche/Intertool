import { headers } from "next/headers";

/**
 * Returns true if running in SaaS mode (intertool.sh).
 * Set INTERTOOL_MODE=saas in env to enable multi-tenant mode.
 */
export function isSaasMode(): boolean {
  return process.env.INTERTOOL_MODE === "saas";
}

/**
 * Get the org slug for the current request.
 * - SaaS mode: reads from x-org-slug header (set by proxy.ts from subdomain)
 * - Self-hosted mode: returns undefined (single tenant)
 */
export async function getOrgSlug(): Promise<string | undefined> {
  if (!isSaasMode()) return undefined;

  try {
    const h = await headers();
    return h.get("x-org-slug") || undefined;
  } catch {
    // Not in a request context (build time, etc.)
    return undefined;
  }
}
