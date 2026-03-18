import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

/**
 * Authenticate an API request via NextAuth session (web UI) or Bearer token (CLI).
 * Returns the username if authenticated, or a 401 Response if not.
 */
export async function authenticateApi(
  request: NextRequest
): Promise<{ username: string } | NextResponse> {
  // Try NextAuth session first (web UI)
  const session = await auth();
  if (session?.user) {
    const username =
      (session.user as { username?: string }).username ??
      session.user.name ??
      "unknown";
    return { username };
  }

  // Try Bearer token (CLI)
  const apiKey = process.env.INTERTOOL_API_KEY;
  if (apiKey) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${apiKey}`) {
      return { username: process.env.INTERTOOL_ADMIN ?? "cli" };
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Type guard: true if auth succeeded */
export function isAuthenticated(
  result: { username: string } | NextResponse
): result is { username: string } {
  return "username" in result;
}
