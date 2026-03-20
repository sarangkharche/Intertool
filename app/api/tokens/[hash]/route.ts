import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { revokeToken, getUserRole, hasPermission } from "@/lib/rbac";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown"
  ).toLowerCase();
  const orgSlug = await getOrgSlug();
  const { hash } = await params;

  const role = await getUserRole(username, orgSlug);
  if (!role) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  const token = await revokeToken(hash, orgSlug);
  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  // Members can only revoke their own tokens
  const isOwnToken = token.user_id === username;
  const canManageAny = hasPermission(role, "tokens:manage_any");

  if (!isOwnToken && !canManageAny) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
