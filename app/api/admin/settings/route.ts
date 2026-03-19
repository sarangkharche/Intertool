import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings, saveSettings, isAdmin } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { testConnection } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3";
import { seedCategories } from "@/lib/registry";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as { username?: string }).username ?? "";
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);

  // Never expose secrets
  const safeSettings = settings
    ? {
        ...settings,
        s3_secret_access_key: "********",
        github_client_secret: settings.github_client_secret ? "********" : undefined,
        google_client_secret: settings.google_client_secret ? "********" : undefined,
      }
    : null;

  const googleConfigured = !!(settings?.google_client_id || process.env.GOOGLE_CLIENT_ID);
  const githubConfigured = !!(settings?.github_client_id || process.env.GITHUB_ID);

  return NextResponse.json({
    settings: safeSettings,
    is_admin: await isAdmin(username, orgSlug),
    needs_setup: !settings || !isS3Configured(settings),
    org_slug: orgSlug,
    google_client_configured: googleConfigured,
    github_client_configured: githubConfigured,
  });
}

/** PUT = test connection without saving */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as { username?: string }).username;
  const orgSlug = await getOrgSlug();
  if (!username || !(await isAdmin(username, orgSlug))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key, s3_endpoint, s3_session_token } = body;

  if (!s3_bucket || !s3_access_key_id || !s3_secret_access_key) {
    return NextResponse.json(
      { error: "Bucket, access key, and secret key are required" },
      { status: 400 }
    );
  }

  // Build temporary settings for testing
  const testSettings = {
    admin_username: username,
    configured_at: new Date().toISOString(),
    s3_bucket,
    s3_region: s3_region || "us-east-1",
    s3_access_key_id,
    s3_secret_access_key,
    s3_endpoint: s3_endpoint || undefined,
    s3_session_token: s3_session_token || undefined,
    org_slug: orgSlug,
  };

  const result = await testConnection(testSettings);
  return NextResponse.json(result);
}

/** POST = save settings */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as { username?: string }).username;
  if (!username) {
    return NextResponse.json(
      { error: "Username required" },
      { status: 400 }
    );
  }

  const orgSlug = await getOrgSlug();
  if (!(await isAdmin(username, orgSlug))) {
    return NextResponse.json(
      { error: "Only the admin can change settings" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    s3_bucket,
    s3_region,
    s3_access_key_id,
    s3_secret_access_key,
    s3_endpoint,
    s3_session_token,
    github_client_id,
    github_client_secret,
    google_client_id,
    google_client_secret,
    google_auth_enabled,
    google_allowed_domains,
    github_org,
    github_org_required,
    webhook_url,
    webhook_events,
  } = body;

  if (!s3_bucket || !s3_access_key_id) {
    return NextResponse.json(
      { error: "Bucket and access key are required" },
      { status: 400 }
    );
  }

  // Validate: if enabling Google auth, at least one domain is required
  if (google_auth_enabled === true) {
    if (!Array.isArray(google_allowed_domains) || google_allowed_domains.length === 0) {
      return NextResponse.json(
        { error: "At least one allowed domain is required when enabling Google auth" },
        { status: 400 }
      );
    }
  }

  const existing = await getSettings(orgSlug);

  // If no secret provided on update, keep existing
  const secret = s3_secret_access_key || existing?.s3_secret_access_key;
  if (!secret) {
    return NextResponse.json(
      { error: "Secret access key is required" },
      { status: 400 }
    );
  }

  const provider = (session.user as { provider?: string }).provider;

  // Resolve OAuth secrets — keep existing if masked or not provided
  const resolvedGithubSecret =
    github_client_secret && github_client_secret !== "********"
      ? github_client_secret
      : existing?.github_client_secret;
  const resolvedGoogleSecret =
    google_client_secret && google_client_secret !== "********"
      ? google_client_secret
      : existing?.google_client_secret;

  const newSettings = {
    admin_username: existing?.admin_username || username,
    admin_email:
      provider === "google"
        ? username
        : existing?.admin_email || undefined,
    configured_at: new Date().toISOString(),
    s3_bucket,
    s3_region: s3_region || "us-east-1",
    s3_access_key_id,
    s3_secret_access_key: secret,
    s3_endpoint: s3_endpoint || undefined,
    s3_session_token: s3_session_token || existing?.s3_session_token || undefined,
    org_slug: orgSlug,
    org_name: existing?.org_name,
    github_client_id:
      github_client_id !== undefined
        ? github_client_id || undefined
        : existing?.github_client_id,
    github_client_secret: resolvedGithubSecret || undefined,
    google_client_id:
      google_client_id !== undefined
        ? google_client_id || undefined
        : existing?.google_client_id,
    google_client_secret: resolvedGoogleSecret || undefined,
    google_auth_enabled:
      google_auth_enabled !== undefined
        ? google_auth_enabled
        : existing?.google_auth_enabled,
    google_allowed_domains:
      google_allowed_domains !== undefined
        ? google_allowed_domains
        : existing?.google_allowed_domains,
    github_org:
      github_org !== undefined
        ? github_org || undefined
        : existing?.github_org,
    github_org_required:
      github_org_required !== undefined
        ? github_org_required
        : existing?.github_org_required,
    webhook_url:
      webhook_url !== undefined
        ? webhook_url || undefined
        : existing?.webhook_url,
    webhook_events:
      webhook_events !== undefined
        ? webhook_events
        : existing?.webhook_events,
  };

  await saveSettings(newSettings, orgSlug);

  // Test connection before seeding
  const connTest = await testConnection(newSettings);
  if (!connTest.ok) {
    return NextResponse.json(
      { error: `Settings saved but S3 connection failed: ${connTest.error}` },
      { status: 422 }
    );
  }

  // Seed categories on first setup
  try {
    await seedCategories(newSettings);
  } catch {
    // Non-fatal — categories will fall back to hardcoded
  }

  return NextResponse.json({ success: true });
}
