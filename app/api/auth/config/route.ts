import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);

  const googleClientConfigured = !!(
    settings?.google_client_id || process.env.GOOGLE_CLIENT_ID
  );
  const googleEnabled =
    googleClientConfigured && settings?.google_auth_enabled === true;

  const domains = settings?.google_allowed_domains ?? [];

  return NextResponse.json(
    {
      github: true,
      google: googleEnabled,
      google_domain_hint: domains.length === 1 ? domains[0] : null,
      github_org_required:
        !!settings?.github_org_required && !!settings?.github_org,
    },
    { headers: noStoreHeaders() }
  );
}
