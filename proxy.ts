import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ORG_COOKIE = "intertool.org";
const isSaas = () => process.env.INTERTOOL_MODE === "saas";
const isLocalSaasFallback = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.INTERTOOL_LOCAL_SAAS_FALLBACK === "true";
const ORG_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

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
  "/robots.txt",
  "/sitemap.xml",
  "/docs",
  "/llms",
  "/llms.txt",
  "/llms-full.txt",
];

/** Top-level app routes that are not org slugs. */
const RESERVED_SEGMENTS = new Set([
  "api",
  "_next",
  "admin",
  "app",
  "auth",
  "billing",
  "brand",
  "browse",
  "create-org",
  "dashboard",
  "design-system",
  "docs",
  "favicon.ico",
  "help",
  "icon.svg",
  "invite",
  "llms",
  "llms.txt",
  "llms-full.txt",
  "login",
  "opengraph-image",
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

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function getFirstSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[0];
}

function getPathOrgSlug(pathname: string): string | undefined {
  const segment = getFirstSegment(pathname);
  if (!segment) return undefined;
  if (RESERVED_SEGMENTS.has(segment)) return undefined;
  if (!ORG_SLUG_RE.test(segment)) return undefined;
  return segment;
}

function stripOrgPrefix(pathname: string, orgSlug: string): string {
  const rest = pathname.slice(orgSlug.length + 1);
  return rest || "/";
}

function withOrgHeader(request: NextRequest, orgSlug: string): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-slug", orgSlug);
  return requestHeaders;
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
  return response;
}

function orgPath(orgSlug: string, pathname: string): string {
  if (pathname === "/") return `/${orgSlug}`;
  return `/${orgSlug}${pathname}`;
}

/** Check if a user has an org without loading Node-only app modules in proxy. */
async function getUserOrg(
  username: string,
  request: NextRequest
): Promise<string | null> {
  if (isLocalSaasFallback()) {
    try {
      const res = await fetch(new URL("/api/orgs", request.url), {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { org?: string | null };
      return data.org ?? null;
    } catch {
      return null;
    }
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/user:${username}:org`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSaas()) {
    return NextResponse.next();
  }

  const pathOrgSlug = getPathOrgSlug(pathname);
  if (pathOrgSlug) {
    const internalPath = stripOrgPrefix(pathname, pathOrgSlug);
    const requestHeaders = withOrgHeader(request, pathOrgSlug);

    if (!isPublicPath(internalPath) && !internalPath.startsWith("/api/")) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });
      if (!token) {
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = `/${pathOrgSlug}/sign-in`;
        signInUrl.search = "";
        signInUrl.searchParams.set(
          "callbackUrl",
          `${pathname}${request.nextUrl.search}`
        );
        return setOrgCookie(
          NextResponse.redirect(signInUrl),
          request,
          pathOrgSlug
        );
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
    return NextResponse.next();
  }

  // GitHub org enforcement — only when GITHUB_ORG is configured
  const githubOrg = process.env.GITHUB_ORG;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    if (pathname === "/") return NextResponse.next();
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(signInUrl);
  }

  if (githubOrg) {
    const userOrgs = (token.githubOrgs as string[]) ?? [];
    if (!userOrgs.includes(githubOrg.toLowerCase())) {
      const signInUrl = new URL("/sign-in?error=github_org", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  const username = token.username as string | undefined;
  const userOrg =
    cookieOrgSlug || (username ? await getUserOrg(username, request) : null);
  if (userOrg) {
    const orgUrl = request.nextUrl.clone();
    orgUrl.pathname = orgPath(userOrg, pathname);
    return setOrgCookie(NextResponse.redirect(orgUrl), request, userOrg);
  }

  return NextResponse.redirect(new URL("/create-org", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
