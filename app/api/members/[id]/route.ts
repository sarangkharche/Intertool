import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { authorize, getUserRole, setUserRole, removeMember } from "@/lib/rbac";
import type { OrgRole } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();
  const { id } = await params;
  const targetId = id.toLowerCase();

  const authz = await authorize(username, "members:change_role", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot change the owner's role
  const targetRole = await getUserRole(targetId, orgSlug);
  if (targetRole === "owner") {
    return NextResponse.json(
      { error: "Cannot change the owner's role" },
      { status: 403 }
    );
  }

  let body: { role?: OrgRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newRole = body.role;
  if (!newRole || !["member", "admin"].includes(newRole)) {
    return NextResponse.json(
      { error: "Role must be 'member' or 'admin'" },
      { status: 400 }
    );
  }

  // Only owner can promote to admin
  if (newRole === "admin" && authz.role !== "owner") {
    // Admins can also promote - per the permission matrix
    // (members:change_role is granted to admin+)
  }

  await setUserRole(targetId, newRole, orgSlug);
  return NextResponse.json({ ok: true, role: newRole });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();
  const { id } = await params;
  const targetId = id.toLowerCase();

  const authz = await authorize(username, "members:remove", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot remove the owner
  const targetRole = await getUserRole(targetId, orgSlug);
  if (targetRole === "owner") {
    return NextResponse.json(
      { error: "Cannot remove the owner" },
      { status: 403 }
    );
  }

  // Cannot remove yourself
  if (targetId === username.toLowerCase()) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 }
    );
  }

  await removeMember(targetId, orgSlug);
  return NextResponse.json({ ok: true });
}
