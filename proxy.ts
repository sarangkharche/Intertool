import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  normalizeAuthCallbackUrl,
  orgAwareAuthRedirectPath,
} from "./lib/auth-redirects";
import { isUsableOrgSlug } from "./lib/org-slugs";
import {
  isPublicRouteAliasSegment,
} from "./lib/public-route-aliases";

const ORG_COOKIE = "intertool.org";
const AUTH_SESSION_COOKIE =
  process.env.NODE_ENV === "development"
    ? "authjs.session-token"
    : "__Secure-authjs.session-token";
const isSaas = () => process.env.INTERTOOL_MODE === "saas";
const isLocalSaasFallback = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.INTERTOOL_LOCAL_SAAS_FALLBACK === "true";
const NO_STORE_VALUE = "private, no-store, max-age=0, must-revalidate";

/** Internal paths that bypass SaaS org checks. */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/create-org",
  "/invite",
  "/api/auth/",
  "/api/orgs",
  "/_next/",
  "/icon.svg",
  "/opengraph-image",
  "/pricing",
  "/robots.txt",
  "/sitemap.xml",
  "/docs",
  "/llms",
  "/llms.txt",
  "/llms-full.txt",
];

const ROOT_ORG_ROUTE_SEGMENTS = new Set([
  "admin",
  "browse",
  "dashboard",
  "design-system",
  "publish",
  "review",
  "search",
  "settings",
  "skills",
  "teams",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function getFirstSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[0];
}

function getPathOrgSlug(pathname: string): string | undefined {
  const segment = getFirstSegment(pathname);
  if (!segment) return undefined;
  return isUsableOrgSlug(segment) ? segment : undefined;
}

function stripPathPrefix(pathname: string, prefix: string): string {
  const rest = pathname.slice(prefix.length + 1);
  return rest || "/";
}

function withOrgHeader(request: NextRequest, orgSlug: string): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-slug", orgSlug);
  return requestHeaders;
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", NO_STORE_VALUE);
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return response;
}

function setOrgCookie(
  response: NextResponse,
  request: NextRequest,
  orgSlug: string
): NextResponse {
  response.cookies.set(ORG_COOKIE, orgSlug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: request.nextUrl.protocol === "https:",
  });
  return noStore(response);
}

function clearOrgCookie(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  response.cookies.set(ORG_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 0,
  });
  return noStore(response);
}

function orgPath(orgSlug: string, pathname: string): string {
  if (pathname === "/") return `/${orgSlug}`;
  return `/${orgSlug}${pathname}`;
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function orgPathForInternalPath(orgSlug: string, internalPath: string): string {
  if (internalPath === "/") return `/${orgSlug}`;
  return `/${orgSlug}${internalPath}`;
}

function requestCallbackPath(request: NextRequest): string {
  return normalizeAuthCallbackUrl(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    request.nextUrl.origin
  );
}

function callbackParam(
  request: NextRequest,
  value: string | null | undefined
): string {
  return normalizeAuthCallbackUrl(value, request.nextUrl.origin);
}

function safeUserOrg(
  data: { org?: unknown; orgs?: unknown } | null | undefined
): string | null {
  if (!data) return null;
  if (isUsableOrgSlug(data.org)) return data.org;
  if (Array.isArray(data.orgs)) {
    return data.orgs.find(isUsableOrgSlug) ?? null;
  }
  return null;
}

/** Check if a user has an org without loading Node-only app modules in proxy. */
async function getUserOrg(
  username: string,
  request: NextRequest
): Promise<string | null> {
  try {
    const res = await fetch(new URL("/api/orgs", request.url), {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        org?: string | null;
        orgs?: string[];
      };
      return safeUserOrg(data);
    }
  } catch {
    // Fall back to the legacy Redis lookup below.
  }

  if (isLocalSaasFallback()) return null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/user:${username}:org`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return isUsableOrgSlug(data.result) ? data.result : null;
  } catch {
    return null;
  }
}

function getAuthToken(request: NextRequest) {
  return getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: AUTH_SESSION_COOKIE,
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSaas()) {
    return NextResponse.next();
  }

  const firstSegment = getFirstSegment(pathname);
  if (firstSegment && isPublicRouteAliasSegment(firstSegment)) {
    const internalPath = stripPathPrefix(pathname, firstSegment);
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = internalPath;

    if (isPublicPath(internalPath) || internalPath.startsWith("/api/")) {
      return NextResponse.rewrite(targetUrl);
    }

    return NextResponse.redirect(targetUrl);
  }

  if (firstSegment === "default") {
    const segments = pathSegments(pathname);
    if (segments[1] === "sign-in") {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set(
        "callbackUrl",
        callbackParam(request, request.nextUrl.searchParams.get("callbackUrl"))
      );
      return clearOrgCookie(NextResponse.redirect(signInUrl), request);
    }
  }

  const pathOrgSlug = getPathOrgSlug(pathname);
  if (pathOrgSlug) {
    const internalPath = stripPathPrefix(pathname, pathOrgSlug);
    const requestHeaders = withOrgHeader(request, pathOrgSlug);

    if (!isPublicPath(internalPath) && !internalPath.startsWith("/api/")) {
      const token = await getAuthToken(request);
      if (!token) {
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = `/${pathOrgSlug}/sign-in`;
        signInUrl.search = "";
        signInUrl.searchParams.set("callbackUrl", requestCallbackPath(request));
        return setOrgCookie(
          NextResponse.redirect(signInUrl),
          request,
          pathOrgSlug
        );
      }

      const username = token.username as string | undefined;
      const userOrg = username ? await getUserOrg(username, request) : null;
      if (!userOrg) {
        return clearOrgCookie(
          NextResponse.redirect(new URL("/create-org", request.url)),
          request
        );
      }

      if (userOrg !== pathOrgSlug) {
        const orgUrl = request.nextUrl.clone();
        orgUrl.pathname = orgPathForInternalPath(userOrg, internalPath);
        return setOrgCookie(NextResponse.redirect(orgUrl), request, userOrg);
      }
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = internalPath;
    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    return setOrgCookie(response, request, pathOrgSlug);
  }

  const cookieOrgSlug = request.cookies.get(ORG_COOKIE)?.value;

  if (pathname.startsWith("/api/")) {
    if (cookieOrgSlug) {
      return NextResponse.next({
        request: { headers: withOrgHeader(request, cookieOrgSlug) },
      });
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    if (pathname.startsWith("/sign-in") && cookieOrgSlug) {
      return clearOrgCookie(response, request);
    }
    return response;
  }

  // GitHub org enforcement — only when GITHUB_ORG is configured
  const githubOrg = process.env.GITHUB_ORG;
  const token = await getAuthToken(request);

  if (!token) {
    if (pathname === "/") return NextResponse.next();
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", requestCallbackPath(request));
    return clearOrgCookie(NextResponse.redirect(signInUrl), request);
  }

  if (githubOrg) {
    const userOrgs = (token.githubOrgs as string[]) ?? [];
    if (!userOrgs.includes(githubOrg.toLowerCase())) {
      const signInUrl = new URL("/sign-in?error=github_org", request.url);
      return noStore(NextResponse.redirect(signInUrl));
    }
  }

  const username = token.username as string | undefined;
  const userOrg = username ? await getUserOrg(username, request) : null;
  if (userOrg) {
    const normalizedCallbackPath = requestCallbackPath(request);
    if (normalizedCallbackPath !== `${pathname}${request.nextUrl.search}`) {
      const orgUrl = new URL(
        orgAwareAuthRedirectPath(normalizedCallbackPath, userOrg),
        request.url
      );
      return setOrgCookie(NextResponse.redirect(orgUrl), request, userOrg);
    }

    const segments = pathSegments(pathname);
    if (firstSegment && ROOT_ORG_ROUTE_SEGMENTS.has(firstSegment)) {
      return setOrgCookie(
        NextResponse.next({
          request: { headers: withOrgHeader(request, userOrg) },
        }),
        request,
        userOrg
      );
    }

    const secondSegment = segments[1];
    if (secondSegment && ROOT_ORG_ROUTE_SEGMENTS.has(secondSegment)) {
      const orgUrl = request.nextUrl.clone();
      orgUrl.pathname = `/${userOrg}/${segments.slice(1).join("/")}`;
      return setOrgCookie(NextResponse.redirect(orgUrl), request, userOrg);
    }

    const orgUrl = request.nextUrl.clone();
    orgUrl.pathname = orgPath(userOrg, pathname);
    return setOrgCookie(NextResponse.redirect(orgUrl), request, userOrg);
  }

  return clearOrgCookie(
    NextResponse.redirect(new URL("/create-org", request.url)),
    request
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
