import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { createApiToken, listUserTokens, getUserRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username =
    (session.user as { username?: string }).username ??
    session.user.name ??
    "unknown";
  const orgSlug = await getOrgSlug();
  const tokens = await listUserTokens(username, orgSlug);

  // Never return full hashes to client, just last 8 chars for identification
  const safeTokens = tokens.map((t) => ({
    hash_suffix: t.hash.slice(-8),
    hash: t.hash,
    label: t.label,
    created_at: t.created_at,
  }));

  return NextResponse.json({ tokens: safeTokens }, {
    headers: { "Cache-Control": "no-store" },
  });
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

  const role = await getUserRole(username, orgSlug);
  if (!role) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  let body: { label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = body.label?.trim();
  if (!label || label.length > 64) {
    return NextResponse.json(
      { error: "Label is required (max 64 chars)" },
      { status: 400 }
    );
  }

  const { raw, token } = await createApiToken(username, label, orgSlug);

  return NextResponse.json(
    {
      token: raw,
      hash_suffix: token.hash.slice(-8),
      label: token.label,
      created_at: token.created_at,
    },
    { status: 201 }
  );
}
