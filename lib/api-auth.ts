import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { getUserRole, lookupToken } from "./rbac";
import { getOrgSlug } from "./org";
import type { OrgRole } from "./types";

export interface AuthResult {
  username: string;
  role: OrgRole;
}

/**
 * Authenticate an API request via NextAuth session (web UI) or Bearer token (CLI).
 * Returns the username and role if authenticated, or a 401 Response if not.
 */
export async function authenticateApi(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const orgSlug = await getOrgSlug();

  // Try NextAuth session first (web UI)
  const session = await auth();
  if (session?.user) {
    const username =
      (session.user as { username?: string }).username ??
      session.user.name ??
      "unknown";
    const role = await getUserRole(username, orgSlug);
    return { username, role: role ?? "member" };
  }

  // Try Bearer token (CLI)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    // Try per-user token first (itk_ prefix)
    if (token.startsWith("itk_")) {
      const apiToken = await lookupToken(token);
      if (apiToken) {
        const role = await getUserRole(apiToken.user_id, orgSlug);
        return { username: apiToken.user_id, role: role ?? "member" };
      }
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Legacy shared API key fallback
    const apiKey = process.env.INTERTOOL_API_KEY;
    if (apiKey && token === apiKey) {
      const adminUser = process.env.INTERTOOL_ADMIN ?? "cli";
      const role = await getUserRole(adminUser, orgSlug);
      return { username: adminUser, role: role ?? "owner" };
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Type guard: true if auth succeeded */
export function isAuthenticated(
  result: AuthResult | NextResponse
): result is AuthResult {
  return "username" in result;
}
