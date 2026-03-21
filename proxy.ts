import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SAAS_DOMAIN = process.env.INTERTOOL_DOMAIN || "intertool.sh";
const isSaas = () => process.env.INTERTOOL_MODE === "saas";

/** Paths that bypass auth and SaaS org checks */
const PUBLIC_PREFIXES = [
  "/sign-in", "/create-org", "/api/auth/", "/api/orgs",
  "/_next/", "/icon.svg", "/docs", "/llms",
];

/** Paths that are only accessible on bare domain (no org context needed) */
const BARE_DOMAIN_PATHS = ["/sign-in", "/create-org", "/api/auth/", "/api/orgs"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isBareDomainPath(pathname: string): boolean {
  return BARE_DOMAIN_PATHS.some((p) => pathname.startsWith(p));
}

/** Check if a user has an org via Upstash REST (lightweight, no SDK needed) */
async function getUserOrg(username: string): Promise<string | null> {
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
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  let orgSlug: string | undefined;

  // Extract org slug from subdomain (e.g., storio.intertool.sh → storio)
  if (isSaas() && host.endsWith(`.${SAAS_DOMAIN}`)) {
    const sub = host.replace(`.${SAAS_DOMAIN}`, "").split(".")[0];
    if (sub && sub !== "www") {
      orgSlug = sub;
    }
  }

  // Local dev: extract org slug from *.localhost (e.g., storio.localhost:3000 → storio)
  if (isSaas() && !orgSlug) {
    const hostWithoutPort = host.split(":")[0];
    if (hostWithoutPort.endsWith(".localhost") && hostWithoutPort !== "localhost") {
      const sub = hostWithoutPort.replace(".localhost", "").split(".")[0];
      if (sub && sub !== "www") {
        orgSlug = sub;
      }
    }
  }

  // Detect bare domain in SaaS mode (no subdomain)
  const isBareDomain = isSaas() && !orgSlug && (
    host === SAAS_DOMAIN ||
    host === `www.${SAAS_DOMAIN}` ||
    host.startsWith("localhost")
  );

  // Skip auth checks for public paths
  if (isPublicPath(pathname)) {
    if (orgSlug) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-slug", orgSlug);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // SaaS bare domain: signed-in users must have an org or go to /create-org
  if (isBareDomain && !isBareDomainPath(pathname)) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

    if (!token) {
      // Not signed in: let them see the landing page at /
      if (pathname === "/") return NextResponse.next();
      // Any other page: redirect to sign-in
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Signed in: check if they have an org
    const username = token.username as string | undefined;
    if (username) {
      const userOrg = await getUserOrg(username);
      if (userOrg) {
        // Has org: redirect to their subdomain
        const protocol = request.nextUrl.protocol;
        const port = request.nextUrl.port ? `:${request.nextUrl.port}` : "";
        const hostWithoutPort = host.split(":")[0];
        const baseDomain = hostWithoutPort === "localhost" ? "localhost" : SAAS_DOMAIN;
        return NextResponse.redirect(
          new URL(`${protocol}//${userOrg}.${baseDomain}${port}${pathname}`)
        );
      }
    }

    // No org: redirect to create-org (unless already there)
    return NextResponse.redirect(new URL("/create-org", request.url));
  }

  // GitHub org enforcement — only when GITHUB_ORG is configured
  const githubOrg = process.env.GITHUB_ORG;
  if (githubOrg) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      const signInUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }

    const userOrgs = (token.githubOrgs as string[]) ?? [];
    if (!userOrgs.includes(githubOrg.toLowerCase())) {
      const signInUrl = new URL("/sign-in?error=github_org", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Set org slug header for SaaS mode
  if (orgSlug) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-org-slug", orgSlug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
