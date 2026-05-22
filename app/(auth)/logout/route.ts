import { NextRequest, NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/cache-control";

const ORG_COOKIE = "intertool.org";

const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
];

const AUTH_COOKIE_PREFIXES = [
  "authjs.",
  "__Secure-authjs.",
  "__Host-authjs.",
  "next-auth.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

function logoutRedirectUrl(request: NextRequest): URL {
  const target = request.nextUrl.searchParams.get("callbackUrl") ?? "/";
  if (!target || target.startsWith("//")) return new URL("/", request.url);

  try {
    if (target.startsWith("/")) return new URL(target, request.url);

    const absoluteUrl = new URL(target);
    if (absoluteUrl.origin === request.nextUrl.origin) {
      return new URL(
        `${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`,
        request.url
      );
    }
  } catch {
    // Fall back to the public home page.
  }

  return new URL("/", request.url);
}

function cookieNamesToClear(request: NextRequest): string[] {
  return Array.from(
    new Set([
      ORG_COOKIE,
      ...AUTH_COOKIE_NAMES,
      ...request.cookies
        .getAll()
        .map((cookie) => cookie.name)
        .filter((name) =>
          AUTH_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))
        ),
    ])
  );
}

function clearCookie(
  response: NextResponse,
  request: NextRequest,
  name: string
) {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 0,
  });
}

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(logoutRedirectUrl(request), {
    headers: noStoreHeaders(),
  });

  for (const name of cookieNamesToClear(request)) {
    clearCookie(response, request, name);
  }

  return response;
}

export const POST = GET;
