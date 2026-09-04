import { PUBLIC_ROUTE_ALIASES } from "./public-route-aliases";

export const ORG_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const RESERVED_ORG_SLUGS = new Set([
  "_next",
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "brand",
  "browse",
  "create-org",
  "dashboard",
  "default",
  "design-system",
  "docs",
  "favicon.ico",
  "help",
  "icon.svg",
  "invite",
  "install",
  ...PUBLIC_ROUTE_ALIASES,
  "llms",
  "llms-full.txt",
  "llms.txt",
  "login",
  "logout",
  "opengraph-image",
  "pricing",
  "publish",
  "review",
  "robots.txt",
  "search",
  "settings",
  "sign-in",
  "sign-up",
  "signup",
  "sitemap.xml",
  "skills",
  "status",
  "support",
  "teams",
  "www",
]);

export function normalizeOrgSlug(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export function isReservedOrgSlug(value: unknown): boolean {
  return typeof value === "string" && RESERVED_ORG_SLUGS.has(value);
}

export function isUsableOrgSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ORG_SLUG_REGEX.test(value) &&
    !RESERVED_ORG_SLUGS.has(value)
  );
}

export function validateOrgSlug(slug: string):
  | { ok: true }
  | {
      ok: false;
      status: 400 | 409;
      message: string;
      reason: string;
    } {
  if (!slug) {
    return {
      ok: false,
      status: 400,
      message: "slug is required",
      reason: "Slug is required",
    };
  }

  if (!ORG_SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      status: 400,
      message: "Slug must be 3-40 lowercase alphanumeric characters or hyphens",
      reason: "Must be 3-40 lowercase letters, numbers, or hyphens",
    };
  }

  if (RESERVED_ORG_SLUGS.has(slug)) {
    return {
      ok: false,
      status: 409,
      message: "This name is reserved",
      reason: "This name is reserved",
    };
  }

  return { ok: true };
}
