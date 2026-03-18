import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";

export async function GET() {
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);

  const googleClientConfigured = !!process.env.GOOGLE_CLIENT_ID;
  const googleEnabled =
    googleClientConfigured && settings?.google_auth_enabled === true;

  const domains = settings?.google_allowed_domains ?? [];

  return NextResponse.json({
    github: true,
    google: googleEnabled,
    google_domain_hint: domains.length === 1 ? domains[0] : null,
    github_org_required: !!settings?.github_org_required && !!settings?.github_org,
  });
}
