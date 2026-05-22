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

const STALE_ORG_PREFIX_SEGMENTS = new Set(["default"]);

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

function stripStaleOrgPrefixes(url: URL): URL {
  const segments = pathSegments(url.pathname);
  let stalePrefixCount = 0;

  while (STALE_ORG_PREFIX_SEGMENTS.has(segments[stalePrefixCount])) {
    stalePrefixCount += 1;
  }

  if (stalePrefixCount === 0) return url;

  const remainingSegments = segments.slice(stalePrefixCount);
  url.pathname =
    remainingSegments.length > 0
      ? `/${remainingSegments.join("/")}`
      : DEFAULT_AUTH_REDIRECT_PATH;
  return url;
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

    stripStaleOrgPrefixes(url);

    if (url.pathname.startsWith("/api/auth/")) {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    return pathWithSearchAndHash(url);
  }

  return DEFAULT_AUTH_REDIRECT_PATH;
}

function pathSegments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function orgAwareAuthRedirectPath(
  callbackPath: string,
  orgSlug: string
): string {
  const url = asInternalUrl(callbackPath);
  if (!url) return `/${orgSlug}${DEFAULT_AUTH_REDIRECT_PATH}`;

  stripStaleOrgPrefixes(url);

  const segments = pathSegments(url.pathname);
  const firstSegment = segments[0];
  if (firstSegment === orgSlug) {
    return pathWithSearchAndHash(url);
  }

  if (!firstSegment) {
    return pathWithSearchAndHash(url);
  }

  if (ORG_AWARE_ROUTE_SEGMENTS.has(firstSegment)) {
    url.pathname = `/${orgSlug}${url.pathname}`;
    return pathWithSearchAndHash(url);
  }

  const secondSegment = segments[1];
  if (secondSegment && ORG_AWARE_ROUTE_SEGMENTS.has(secondSegment)) {
    url.pathname = `/${orgSlug}/${segments.slice(1).join("/")}`;
    return pathWithSearchAndHash(url);
  }

  return pathWithSearchAndHash(url);
}
