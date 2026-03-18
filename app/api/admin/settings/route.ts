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

  // Never expose the secret key
  const safeSettings = settings
    ? {
        ...settings,
        s3_secret_access_key: "********",
      }
    : null;

  return NextResponse.json({
    settings: safeSettings,
    is_admin: await isAdmin(username, orgSlug),
    needs_setup: !settings || !isS3Configured(settings),
    org_slug: orgSlug,
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
      { error: "GitHub username required" },
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
  const { s3_bucket, s3_region, s3_access_key_id, s3_secret_access_key, s3_endpoint, s3_session_token } = body;

  if (!s3_bucket || !s3_access_key_id) {
    return NextResponse.json(
      { error: "Bucket and access key are required" },
      { status: 400 }
    );
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

  const newSettings = {
    admin_username: username,
    configured_at: new Date().toISOString(),
    s3_bucket,
    s3_region: s3_region || "us-east-1",
    s3_access_key_id,
    s3_secret_access_key: secret,
    s3_endpoint: s3_endpoint || undefined,
    s3_session_token: s3_session_token || existing?.s3_session_token || undefined,
    org_slug: orgSlug,
    org_name: existing?.org_name,
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
