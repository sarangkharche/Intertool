import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_SESSION_COOKIE =
  process.env.NODE_ENV === "development"
    ? "authjs.session-token"
    : "__Secure-authjs.session-token";

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/brand"]);
const PUBLIC_PREFIXES = [
  "/api/",
  "/docs",
  "/llms",
  "/_next/",
  "/icon.svg",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/logout",
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function redirectToLanding(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  // A Vercel web deployment cannot serve authenticated product routes until
  // the separately hosted API has been configured. Avoid leaving stale
  // sessions on a dashboard that can only fail against the localhost fallback.
  if (process.env.NODE_ENV === "production" && !process.env.SERVER_URL) {
    return redirectToLanding(request);
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: AUTH_SESSION_COOKIE,
  });
  if (token) return NextResponse.next();

  return redirectToLanding(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
