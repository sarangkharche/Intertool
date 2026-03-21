import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { authorize, getUserRole, listMembers } from "@/lib/rbac";
import { createInvitation, getInvitationByEmail } from "@/lib/invitations";
import { sendInvitationEmail, getEmailTransport } from "@/lib/email";
import { getSettings } from "@/lib/settings";

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

  // Check email transport is configured
  if (!getEmailTransport()) {
    return NextResponse.json(
      { error: "Email transport not configured. Set RESEND_API_KEY or SMTP_HOST." },
      { status: 422 },
    );
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
  }

  const role = (body.role as "member" | "admin") ?? "member";
  if (!["member", "admin"].includes(role)) {
    return NextResponse.json({ error: "Role must be 'member' or 'admin'" }, { status: 400 });
  }

  // Check for existing member
  const members = await listMembers(orgSlug);
  const alreadyMember = members.some((m) => m.id === email);
  if (alreadyMember) {
    return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
  }

  // Check for existing pending invitation
  const existing = await getInvitationByEmail(email, orgSlug);
  if (existing) {
    return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 409 });
  }

  const invitation = await createInvitation(email, role, username, orgSlug);

  // Build accept URL
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
  const acceptUrl = `${baseUrl}/invite?token=${invitation.token}`;

  // Registry name from settings
  const settings = await getSettings(orgSlug);
  const registryName = settings?.org_name || "Intertool Registry";

  const result = await sendInvitationEmail(email, username, registryName, role, acceptUrl);
  if (!result.success) {
    return NextResponse.json(
      { error: `Failed to send email: ${result.error}` },
      { status: 500 },
    );
  }

  // Return invitation without full token
  return NextResponse.json(
    {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        invited_by: invitation.invited_by,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        token_preview: invitation.token.slice(0, 8) + "...",
      },
    },
    { status: 201 },
  );
}
