import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { authorize } from "@/lib/rbac";
import {
  getInvitation,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
} from "@/lib/invitations";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
}

// GET: public, returns invitation details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitation = await getInvitation(token);

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found or expired" },
      { status: 404 },
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 410 },
    );
  }

  return NextResponse.json({
    invitation: {
      email: maskEmail(invitation.email),
      role: invitation.role,
      invited_by: invitation.invited_by,
      org_slug: invitation.org_slug,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
    },
  });
}

// POST: accept or decline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;

  if (action === "decline") {
    const inv = await declineInvitation(token);
    if (!inv) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Invitation declined" });
  }

  if (action === "accept") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in to accept this invitation" }, { status: 401 });
    }

    const invitation = await getInvitation(token);
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
    }

    // Verify the signed-in user's email matches the invitation
    const sessionEmail = session.user.email?.toLowerCase();
    const username = (session.user as { username?: string }).username?.toLowerCase();
    const provider = (session.user as { provider?: string }).provider;

    if (sessionEmail !== invitation.email && username !== invitation.email) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 },
      );
    }

    const inv = await acceptInvitation(token, {
      display_name: session.user.name ?? invitation.email,
      provider: (provider as "github" | "google") ?? "google",
      avatar_url: session.user.image ?? undefined,
    });

    if (!inv) {
      return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Invitation accepted" });
  }

  return NextResponse.json({ error: "Action must be 'accept' or 'decline'" }, { status: 400 });
}

// DELETE: admin revoke
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
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

  const authz = await authorize(username, "members:invite", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;
  const inv = await revokeInvitation(token);
  if (!inv) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
