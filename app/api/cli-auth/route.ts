import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiToken } from "@/lib/rbac";
import { getOrgSlug } from "@/lib/org";

/**
 * CLI auth flow:
 * 1. CLI opens browser to /api/cli-auth?port=XXXXX
 * 2. If user is signed in, generate a personal API token and redirect to CLI
 * 3. If not signed in, redirect to sign-in first, then back here
 */
export async function GET(request: NextRequest) {
  const port = request.nextUrl.searchParams.get("port");

  if (!port) {
    return NextResponse.json({ error: "port parameter required" }, { status: 400 });
  }

  // Validate port is numeric and in valid range
  const portNum = Number(port);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: "port must be a number between 1 and 65535" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = `/api/cli-auth?port=${port}`;
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
    );
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";

  const orgSlug = await getOrgSlug();

  // Generate a personal API token for CLI use
  const { raw } = await createApiToken(username, "CLI", orgSlug);

  return NextResponse.redirect(
    `http://localhost:${portNum}/callback?token=${raw}&username=${encodeURIComponent(username)}`
  );
}
