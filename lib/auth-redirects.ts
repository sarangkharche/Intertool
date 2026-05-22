import { normalizePublicRouteAliasCallbackUrl } from "./public-route-aliases";

export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";

const INTERNAL_URL_BASE = "https://intertool.local";
const MAX_CALLBACK_UNWRAP_DEPTH = 4;

const ORG_AWARE_ROUTE_SEGMENTS = new Set([
  "admin",
  "browse",
  "dashboard",
  "publish",
  "review",
  "search",
  "settings",
  "skills",
  "teams",
]);

function asInternalUrl(
  value: string,
  allowedOrigin?: string
): URL | undefined {
  if (!value || value.startsWith("//")) return undefined;

  try {
    if (value.startsWith("/")) {
      return new URL(value, INTERNAL_URL_BASE);
    }

    const absoluteUrl = new URL(value);
    if (!allowedOrigin || absoluteUrl.origin !== allowedOrigin) {
      return undefined;
    }
    return new URL(
      `${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`,
      INTERNAL_URL_BASE
    );
  } catch {
    return undefined;
  }
}

function pathWithSearchAndHash(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

function isSignInPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "sign-in" || segments[1] === "sign-in";
}

/**
 * Normalizes Auth.js callback URLs into an internal app path.
 *
 * This intentionally unwraps nested /sign-in?callbackUrl=... values, because
 * repeated redirects can otherwise strand users on a technical auth URL after
 * they already have a valid session.
 */
export function normalizeAuthCallbackUrl(
  callbackUrl: string | null | undefined,
  allowedOrigin?: string
): string {
  let current = callbackUrl?.trim() || DEFAULT_AUTH_REDIRECT_PATH;

  for (let i = 0; i < MAX_CALLBACK_UNWRAP_DEPTH; i += 1) {
    const aliasNormalized = normalizePublicRouteAliasCallbackUrl(current);
    const url = asInternalUrl(aliasNormalized, allowedOrigin);
    if (!url) return DEFAULT_AUTH_REDIRECT_PATH;

    if (url.pathname.startsWith("/api/auth/")) {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    if (isSignInPath(url.pathname)) {
      const nestedCallback = url.searchParams.get("callbackUrl");
      if (nestedCallback && nestedCallback !== current) {
        current = nestedCallback;
        continue;
      }
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    return pathWithSearchAndHash(url);
  }

  return DEFAULT_AUTH_REDIRECT_PATH;
}

function firstPathSegment(path: string): string | undefined {
  return path.split("/").filter(Boolean)[0];
}

export function orgAwareAuthRedirectPath(
  callbackPath: string,
  orgSlug: string
): string {
  const url = asInternalUrl(callbackPath);
  if (!url) return `/${orgSlug}${DEFAULT_AUTH_REDIRECT_PATH}`;

  const firstSegment = firstPathSegment(url.pathname);
  if (firstSegment === orgSlug) {
    return pathWithSearchAndHash(url);
  }

  if (!firstSegment) {
    return pathWithSearchAndHash(url);
  }

  if (!ORG_AWARE_ROUTE_SEGMENTS.has(firstSegment)) {
    return pathWithSearchAndHash(url);
  }

  url.pathname = `/${orgSlug}${url.pathname}`;
  return pathWithSearchAndHash(url);
}
