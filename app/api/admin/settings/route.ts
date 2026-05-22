import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSettings,
  saveSettings,
  isAdmin,
  type RegistrySettings,
} from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { testConnection } from "@/lib/s3";
import { isS3Configured } from "@/lib/s3";
import { seedCategories } from "@/lib/registry";
import { authorize } from "@/lib/rbac";
import { appendAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

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
        github_client_secret: settings.github_client_secret
          ? "********"
          : undefined,
        google_client_secret: settings.google_client_secret
          ? "********"
          : undefined,
        blob_read_write_token: settings.blob_read_write_token
          ? "********"
          : undefined,
      }
    : null;

  const googleConfigured = !!(
    settings?.google_client_id || process.env.GOOGLE_CLIENT_ID
  );
  const githubConfigured = !!(
    settings?.github_client_id || process.env.GITHUB_ID
  );

  const { getUserRole } = await import("@/lib/rbac");
  const role = await getUserRole(username, orgSlug);

  return NextResponse.json(
    {
      settings: safeSettings,
      is_admin: await isAdmin(username, orgSlug),
      role: role ?? "member",
      needs_setup: !settings || !isS3Configured(settings),
      org_slug: orgSlug,
      google_client_configured: googleConfigured,
      github_client_configured: githubConfigured,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

/** PUT = test connection without saving */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as { username?: string }).username;
  const orgSlug = await getOrgSlug();
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  const authz = await authorize(username, "settings:manage", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    storage_driver,
    s3_bucket,
    s3_region,
    s3_access_key_id,
    s3_secret_access_key,
    s3_endpoint,
    s3_session_token,
    blob_store_id,
    blob_read_write_token,
    blob_access,
  } = body;

  const existing = await getSettings(orgSlug);
  const storageDriver =
    storage_driver === "vercel-blob" ||
    existing?.storage_driver === "vercel-blob"
      ? "vercel-blob"
      : "s3";

  if (
    storageDriver === "s3" &&
    (!s3_bucket || !s3_access_key_id || !s3_secret_access_key)
  ) {
    return NextResponse.json(
      { error: "Bucket, access key, and secret key are required" },
      { status: 400 }
    );
  }

  // Build temporary settings for testing
  const testSettings: RegistrySettings = {
    storage_driver: storageDriver,
    admin_username: username,
    configured_at: new Date().toISOString(),
    s3_bucket: storageDriver === "vercel-blob" ? "vercel-blob" : s3_bucket,
    s3_region: s3_region || "us-east-1",
    s3_access_key_id:
      storageDriver === "vercel-blob" ? "managed" : s3_access_key_id,
    s3_secret_access_key:
      storageDriver === "vercel-blob" ? "managed" : s3_secret_access_key,
    s3_endpoint: s3_endpoint || undefined,
    s3_session_token: s3_session_token || undefined,
    org_slug: orgSlug,
    s3_prefix: existing?.s3_prefix,
    blob_store_id: blob_store_id || existing?.blob_store_id || undefined,
    blob_read_write_token:
      blob_read_write_token && blob_read_write_token !== "********"
        ? blob_read_write_token
        : existing?.blob_read_write_token,
    blob_access:
      blob_access !== undefined
        ? blob_access === "public"
          ? "public"
          : "private"
        : existing?.blob_access === "public"
          ? "public"
          : "private",
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
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const orgSlug = await getOrgSlug();
  const authz = await authorize(username, "settings:manage", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json(
      { error: "Only admins can change settings" },
      { status: 403 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    storage_driver,
    s3_bucket,
    s3_region,
    s3_access_key_id,
    s3_secret_access_key,
    s3_endpoint,
    s3_session_token,
    s3_prefix,
    blob_store_id,
    blob_read_write_token,
    blob_access,
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
    publish_review_required,
  } = body;

  const existing = await getSettings(orgSlug);
  const storageDriver =
    storage_driver === "vercel-blob" ||
    existing?.storage_driver === "vercel-blob"
      ? "vercel-blob"
      : "s3";

  if (storageDriver === "s3" && (!s3_bucket || !s3_access_key_id)) {
    return NextResponse.json(
      { error: "Bucket and access key are required" },
      { status: 400 }
    );
  }

  // Validate: if enabling Google auth, at least one domain is required
  if (google_auth_enabled === true) {
    if (
      !Array.isArray(google_allowed_domains) ||
      google_allowed_domains.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one allowed domain is required when enabling Google auth",
        },
        { status: 400 }
      );
    }
  }

  // If no secret provided on update, keep existing
  const secret =
    storageDriver === "vercel-blob"
      ? "managed"
      : s3_secret_access_key || existing?.s3_secret_access_key;
  if (storageDriver === "s3" && !secret) {
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

  const resolvedBlobToken =
    blob_read_write_token && blob_read_write_token !== "********"
      ? blob_read_write_token
      : existing?.blob_read_write_token;

  const newSettings: RegistrySettings = {
    storage_driver: storageDriver,
    admin_username: existing?.admin_username || username,
    admin_email:
      provider === "google" ? username : existing?.admin_email || undefined,
    configured_at: new Date().toISOString(),
    s3_bucket:
      storageDriver === "vercel-blob"
        ? existing?.s3_bucket || "vercel-blob"
        : s3_bucket,
    s3_region:
      storageDriver === "vercel-blob"
        ? existing?.s3_region || process.env.BLOB_REGION || "iad1"
        : s3_region || "us-east-1",
    s3_access_key_id:
      storageDriver === "vercel-blob" ? "managed" : s3_access_key_id,
    s3_secret_access_key: secret,
    s3_endpoint:
      storageDriver === "vercel-blob" ? undefined : s3_endpoint || undefined,
    s3_session_token:
      storageDriver === "vercel-blob"
        ? undefined
        : s3_session_token || existing?.s3_session_token || undefined,
    s3_prefix:
      s3_prefix !== undefined ? s3_prefix || undefined : existing?.s3_prefix,
    blob_store_id:
      blob_store_id !== undefined
        ? blob_store_id || undefined
        : existing?.blob_store_id,
    blob_read_write_token: resolvedBlobToken || undefined,
    blob_access:
      blob_access !== undefined
        ? blob_access === "public"
          ? "public"
          : "private"
        : storageDriver === "vercel-blob"
          ? existing?.blob_access ?? "private"
          : existing?.blob_access,
    org_slug: orgSlug,
    org_name: existing?.org_name,
    plan: existing?.plan,
    subscription_status: existing?.subscription_status,
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
      github_org !== undefined ? github_org || undefined : existing?.github_org,
    github_org_required:
      github_org_required !== undefined
        ? github_org_required
        : existing?.github_org_required,
    webhook_url:
      webhook_url !== undefined
        ? webhook_url || undefined
        : existing?.webhook_url,
    webhook_events:
      webhook_events !== undefined ? webhook_events : existing?.webhook_events,
    publish_review_required:
      publish_review_required !== undefined
        ? !!publish_review_required
        : existing?.publish_review_required,
  };

  // Test connection before saving so a bad update does not poison runtime config.
  const connTest = await testConnection(newSettings);
  if (!connTest.ok) {
    return NextResponse.json(
      { error: `Storage connection failed: ${connTest.error}` },
      { status: 422 }
    );
  }

  const saved = await saveSettings(newSettings, orgSlug);
  if (!saved) {
    return NextResponse.json(
      {
        error:
          "Settings could not be saved. Configure writable storage, Redis, or environment variables.",
      },
      { status: 500 }
    );
  }

  // Seed categories on first setup
  try {
    await seedCategories(newSettings);
  } catch {
    // Non-fatal — categories will fall back to hardcoded
  }

  await appendAuditEvent({
    org_slug: orgSlug,
    actor: username,
    action: "org.settings.updated",
    target_type: "org",
    target_id: orgSlug ?? "default",
    metadata: {
      storage_configured: true,
      publish_review_required: newSettings.publish_review_required ?? false,
    },
  });

  return NextResponse.json({ success: true });
}
