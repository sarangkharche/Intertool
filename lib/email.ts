import { Resend } from "resend";

// ── Transport abstraction ──

interface EmailTransport {
  send(opts: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; error?: string }>;
}

type NodemailerModule = {
  default?: {
    createTransport(opts: Record<string, unknown>): {
      sendMail(opts: Record<string, unknown>): Promise<void>;
    };
  };
  createTransport(opts: Record<string, unknown>): {
    sendMail(opts: Record<string, unknown>): Promise<void>;
  };
};

async function importOptionalPackage(name: string): Promise<unknown> {
  // Keep optional server-only packages out of Turbopack's static dependency graph.
  const importer = new Function("specifier", "return import(specifier)") as (
    specifier: string
  ) => Promise<unknown>;
  return importer(name);
}

function getResendTransport(): EmailTransport | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const resend = new Resend(apiKey);
  return {
    async send({ from, to, subject, html }) {
      const { error } = await resend.emails.send({ from, to, subject, html });
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
  };
}

function getSmtpTransport(): EmailTransport | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  // Lazy require nodemailer only when SMTP is configured
  // nodemailer is an optional dep, not bundled by default
  return {
    async send({ from, to, subject, html }) {
      try {
        const mod = (await importOptionalPackage(
          "nodemailer"
        )) as NodemailerModule;
        const nodemailer = mod.default ?? mod;
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port || "587", 10),
          secure: parseInt(port || "587", 10) === 465,
          auth: { user, pass },
        });
        await transporter.sendMail({ from, to, subject, html });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "SMTP send failed. Is nodemailer installed?",
        };
      }
    },
  };
}

export function getEmailTransport(): EmailTransport | null {
  return getResendTransport() || getSmtpTransport();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPublicBaseUrl(): string {
  const raw =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

// ── Invitation email ──

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  registryName: string,
  role: string,
  acceptUrl: string
): Promise<{ success: boolean; error?: string }> {
  const transport = getEmailTransport();
  if (!transport) {
    return { success: false, error: "No email transport configured" };
  }

  const domain = getPublicBaseUrl();
  const from = process.env.EMAIL_FROM || `noreply@${new URL(domain).hostname}`;
  const safeInviterName = escapeHtml(inviterName);
  const safeRegistryName = escapeHtml(registryName);
  const safeRole = escapeHtml(role);
  const safeAcceptUrl = escapeHtml(acceptUrl);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px">
    <tr><td align="center">
      <table width="460" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:40px">
        <tr><td>
          <h2 style="margin:0 0 8px;color:#fafafa;font-size:18px;font-weight:600">
            You're invited to ${safeRegistryName}
          </h2>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.5">
            <strong style="color:#fafafa">${safeInviterName}</strong> has invited you to join
            <strong style="color:#fafafa">${safeRegistryName}</strong> as a <strong style="color:#fafafa">${safeRole}</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td style="background:#fafafa;border-radius:8px;padding:10px 24px">
              <a href="${safeAcceptUrl}" style="color:#09090b;text-decoration:none;font-size:14px;font-weight:600">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5">
            This invitation expires in 7 days. If you didn't expect this, you can ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return transport.send({
    from,
    to,
    subject: `You're invited to join ${registryName}`,
    html,
  });
}
