import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiToken, getUserRole, hasPermission } from "@/lib/rbac";
import { getOrgSlug, isSaasMode } from "@/lib/org";
import { getOrgForUser } from "@/lib/settings";
import { noStoreHeaders, PRIVATE_NO_STORE } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * CLI auth flow:
 * 1. CLI opens browser to /api/cli-auth?port=XXXXX
 * 2. If user is signed in, generate a personal API token and redirect to CLI
 * 3. If not signed in, redirect to sign-in first, then back here
 */
export async function GET(request: NextRequest) {
  const port = request.nextUrl.searchParams.get("port");

  if (!port) {
    return NextResponse.json(
      { error: "port parameter required" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  // Validate port is numeric and in valid range
  const portNum = Number(port);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json(
      { error: "port must be a number between 1 and 65535" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const session = await auth();
  const orgSlug = await getOrgSlug();
  if (!session?.user) {
    const callbackUrl = orgSlug
      ? `/${orgSlug}/api/cli-auth?port=${port}`
      : `/api/cli-auth?port=${port}`;
    const signInPath = orgSlug ? `/${orgSlug}/sign-in` : "/sign-in";
    const response = NextResponse.redirect(
      new URL(
        `${signInPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        request.url
      )
    );
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    return response;
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  if (username === "unknown") {
    return NextResponse.json(
      { error: "Cannot determine authenticated user" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  if (isSaasMode() && !orgSlug && username !== "unknown") {
    const userOrg = await getOrgForUser(username);
    if (userOrg) {
      const orgAuthUrl = new URL(
        `/${userOrg}/api/cli-auth?port=${port}`,
        request.url
      );
      const response = NextResponse.redirect(orgAuthUrl);
      response.headers.set("Cache-Control", PRIVATE_NO_STORE);
      return response;
    }
    const response = NextResponse.redirect(new URL("/create-org", request.url));
    response.headers.set("Cache-Control", PRIVATE_NO_STORE);
    return response;
  }

  const role = await getUserRole(username, orgSlug);
  if (!role || !hasPermission(role, "tokens:manage_own")) {
    return NextResponse.json(
      { error: "You are not a member of this registry" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  // Generate a personal API token for CLI use
  const { raw } = await createApiToken(username, "CLI", orgSlug);

  const response = NextResponse.redirect(
    `http://localhost:${portNum}/callback?token=${raw}&username=${encodeURIComponent(username)}`
  );
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}
