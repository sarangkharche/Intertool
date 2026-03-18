import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const SAAS_DOMAIN = process.env.INTERTOOL_DOMAIN || "intertool.sh";

/** Paths that bypass auth enforcement */
const PUBLIC_PREFIXES = ["/sign-in", "/api/auth/", "/_next/", "/icon.svg"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  let orgSlug: string | undefined;

  // Extract org slug from subdomain (e.g., storio.intertool.sh → storio)
  if (process.env.INTERTOOL_MODE === "saas" && host.endsWith(`.${SAAS_DOMAIN}`)) {
    const sub = host.replace(`.${SAAS_DOMAIN}`, "").split(".")[0];
    if (sub && sub !== "www") {
      orgSlug = sub;
    }
  }

  // Skip auth checks for public paths
  if (isPublicPath(pathname)) {
    if (orgSlug) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-slug", orgSlug);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // Read JWT
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // GitHub org enforcement
  const githubOrg = process.env.GITHUB_ORG;
  if (githubOrg) {
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
