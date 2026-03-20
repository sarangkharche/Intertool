import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { listMembers, authorize, ensureUserRecord } from "@/lib/rbac";
import type { OrgRole } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgSlug = await getOrgSlug();
  const members = await listMembers(orgSlug);

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();

  const authz = await authorize(username, "members:invite", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { identifier?: string; role?: OrgRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const identifier = body.identifier?.trim().toLowerCase();
  if (!identifier) {
    return NextResponse.json(
      { error: "identifier is required" },
      { status: 400 }
    );
  }

  const role = body.role ?? "member";
  if (!["member", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be 'member' or 'admin'" },
      { status: 400 }
    );
  }

  // Pre-provision user record (they'll get full profile on first sign-in)
  const user = await ensureUserRecord(
    identifier,
    {
      display_name: identifier,
      provider: identifier.includes("@") ? "google" : "github",
    },
    orgSlug
  );

  // Set the requested role (ensureUserRecord defaults to member)
  if (role !== user.role && role !== "owner") {
    const { setUserRole } = await import("@/lib/rbac");
    await setUserRole(identifier, role, orgSlug);
    user.role = role;
  }

  return NextResponse.json({ member: user }, { status: 201 });
}
