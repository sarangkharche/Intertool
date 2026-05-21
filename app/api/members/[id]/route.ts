import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import {
  authorize,
  getUserRole,
  hasPermission,
  setUserRole,
  removeMember,
} from "@/lib/rbac";
import { appendAuditEvent } from "@/lib/audit-log";
import { removeOrgMember } from "@/lib/settings";
import type { OrgRole } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  if (!targetRole) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let body: { role?: OrgRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newRole = body.role;
  if (!newRole || !["member", "admin", "owner"].includes(newRole)) {
    return NextResponse.json(
      { error: "Role must be 'member', 'admin', or 'owner'" },
      { status: 400 }
    );
  }

  if (newRole === "owner") {
    if (!authz.role || !hasPermission(authz.role, "org:transfer_ownership")) {
      return NextResponse.json(
        { error: "Only the owner can transfer ownership" },
        { status: 403 }
      );
    }
    if (targetId === username.toLowerCase()) {
      return NextResponse.json(
        { error: "You are already the owner" },
        { status: 400 }
      );
    }

    await setUserRole(targetId, "owner", orgSlug);
    await setUserRole(username, "admin", orgSlug);
    await appendAuditEvent({
      org_slug: orgSlug,
      actor: username,
      action: "member.role_changed",
      target_type: "member",
      target_id: targetId,
      metadata: {
        role: "owner",
        previous_role: targetRole,
        previous_owner: username,
      },
    });
    return NextResponse.json(
      { ok: true, role: "owner" },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  await setUserRole(targetId, newRole, orgSlug);
  await appendAuditEvent({
    org_slug: orgSlug,
    actor: username,
    action: "member.role_changed",
    target_type: "member",
    target_id: targetId,
    metadata: {
      role: newRole,
    },
  });
  return NextResponse.json(
    { ok: true, role: newRole },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
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
  if (orgSlug) {
    await removeOrgMember(orgSlug, targetId);
  }
  await appendAuditEvent({
    org_slug: orgSlug,
    actor: username,
    action: "member.removed",
    target_type: "member",
    target_id: targetId,
  });
  return NextResponse.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
