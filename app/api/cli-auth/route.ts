import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * CLI auth flow:
 * 1. CLI opens browser to /api/cli-auth?port=XXXXX
 * 2. If user is signed in, redirect to CLI's local server with the API key
 * 3. If not signed in, redirect to sign-in first, then back here
 *
 * The API key is the shared INTERTOOL_API_KEY. The user proves they're
 * a team member via GitHub OAuth, then gets the key for CLI access.
 */
export async function GET(request: NextRequest) {
  const port = request.nextUrl.searchParams.get("port");

  if (!port) {
    return NextResponse.json({ error: "port parameter required" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = `/api/cli-auth?port=${port}`;
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
    );
  }

  const apiKey = process.env.INTERTOOL_API_KEY;
  if (!apiKey) {
    return new NextResponse(
      "INTERTOOL_API_KEY is not configured. Set it in your environment variables.",
      { status: 500 }
    );
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";

  return NextResponse.redirect(
    `http://localhost:${port}/callback?token=${apiKey}&username=${encodeURIComponent(username)}`
  );
}
