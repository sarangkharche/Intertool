import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { listMembers, authorize, ensureUserRecord } from "@/lib/rbac";
import { listPendingInvitations, createInvitation, getInvitationByEmail } from "@/lib/invitations";
import { sendInvitationEmail, getEmailTransport } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import type { OrgRole } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgSlug = await getOrgSlug();
  const members = await listMembers(orgSlug);
  const invitations = await listPendingInvitations(orgSlug);

  return NextResponse.json({
    members,
    invitations: invitations.map((inv) => ({
      token: inv.token,
      email: inv.email,
      role: inv.role,
      invited_by: inv.invited_by,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
    })),
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

  const authz = await authorize(username, "members:invite", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; identifier?: string; role?: OrgRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role ?? "member";
  if (!["member", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be 'member' or 'admin'" },
      { status: 400 },
    );
  }

  // Email-based invitation flow
  const email = body.email?.trim().toLowerCase();
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check email transport
    if (!getEmailTransport()) {
      return NextResponse.json(
        { error: "Email transport not configured. Set RESEND_API_KEY or SMTP_HOST." },
        { status: 422 },
      );
    }

    // Check if already a member
    const members = await listMembers(orgSlug);
    if (members.some((m) => m.id === email)) {
      return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
    }

    // Check for existing invitation
    const existing = await getInvitationByEmail(email, orgSlug);
    if (existing) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 409 },
      );
    }

    const invitation = await createInvitation(email, role, username, orgSlug);

    const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
    const acceptUrl = `${baseUrl}/invite?token=${invitation.token}`;

    const settings = await getSettings(orgSlug);
    const registryName = settings?.org_name || "Intertool Registry";

    const result = await sendInvitationEmail(email, username, registryName, role, acceptUrl);
    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        invitation: {
          email: invitation.email,
          role: invitation.role,
          invited_by: invitation.invited_by,
          created_at: invitation.created_at,
          expires_at: invitation.expires_at,
        },
      },
      { status: 201 },
    );
  }

  // Legacy: identifier-based pre-provisioning (for CLI backward compat)
  const identifier = body.identifier?.trim().toLowerCase();
  if (!identifier) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  try {
    const user = await ensureUserRecord(
      identifier,
      {
        display_name: identifier,
        provider: identifier.includes("@") ? "google" : "github",
      },
      orgSlug,
    );

    if (role !== user.role && role !== "owner") {
      const { setUserRole } = await import("@/lib/rbac");
      await setUserRole(identifier, role, orgSlug);
      user.role = role;
    }

    return NextResponse.json({ member: user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
