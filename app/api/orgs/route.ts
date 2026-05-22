import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrgSlug, isSaasMode } from "@/lib/org";
import {
  createOrg,
  deleteOrg,
  getSettings,
  orgExists,
  getOrgForUser,
  getOrgsForUser,
} from "@/lib/settings";
import { appendAuditEvent } from "@/lib/audit-log";
import { authorize } from "@/lib/rbac";
import { deleteObjects, isS3Configured, listObjects } from "@/lib/s3";
import { getStripe, hasStripe } from "@/lib/stripe";
import { noStoreHeaders } from "@/lib/cache-control";
import { normalizeOrgSlug, validateOrgSlug } from "@/lib/org-slugs";

export const dynamic = "force-dynamic";

function storageUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "Registry metadata storage is unavailable. Configure DATABASE_URL or Upstash Redis.",
    },
    { status: 503 }
  );
}

function publicBaseUrl() {
  return (
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "");
}

function normalizePrefix(prefix?: string): string {
  return (prefix ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

async function deleteManagedStorageObjects(
  orgSlug: string
): Promise<number> {
  const settings = await getSettings(orgSlug);
  if (!settings || !isS3Configured(settings)) return 0;

  const prefix = normalizePrefix(settings.s3_prefix);
  if (prefix !== `orgs/${orgSlug}`) return 0;

  const keys = await listObjects(settings, "");
  await deleteObjects(settings, keys);
  return keys.length;
}

async function cancelStripeSubscription(orgSlug: string): Promise<boolean> {
  const settings = await getSettings(orgSlug);
  if (!settings?.stripe_subscription_id || !hasStripe()) return false;
  if (settings.subscription_status === "canceled") return false;

  await getStripe().subscriptions.cancel(settings.stripe_subscription_id);
  return true;
}

/** POST = create a new org (SaaS mode only) */
export async function POST(request: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json(
      { error: "Not available in self-hosted mode" },
      { status: 404 }
    );
  }

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

  // Check if user already has an org
  let existingOrg: string | null;
  try {
    existingOrg = await getOrgForUser(username);
  } catch {
    return storageUnavailableResponse();
  }
  if (existingOrg) {
    return NextResponse.json(
      {
        error: `You already have an organization: ${existingOrg}`,
        org: existingOrg,
        path: `/${existingOrg}`,
      },
      { status: 409 }
    );
  }

  let reqBody: { slug?: unknown; name?: unknown };
  try {
    reqBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const slug = normalizeOrgSlug(reqBody.slug);
  const name = typeof reqBody.name === "string" ? reqBody.name.trim() : "";

  if (!slug || !name) {
    return NextResponse.json(
      { error: "slug and name are required" },
      { status: 400 }
    );
  }

  const validation = validateOrgSlug(slug);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.message,
      },
      { status: validation.status }
    );
  }

  let exists = false;
  try {
    exists = await orgExists(slug);
  } catch {
    return storageUnavailableResponse();
  }

  if (exists) {
    return NextResponse.json(
      { error: "Organization already exists" },
      { status: 409 }
    );
  }

  try {
    await createOrg(slug, name, username);
    await appendAuditEvent({
      org_slug: slug,
      actor: username,
      action: "org.created",
      target_type: "org",
      target_id: slug,
      metadata: {
        name,
      },
    });
    const baseUrl = publicBaseUrl();
    const path = `/${slug}`;

    return NextResponse.json(
      { slug, name, path, url: baseUrl ? `${baseUrl}${path}` : path },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create organization";
    return NextResponse.json(
      {
        error:
          message === "fetch failed"
            ? "Registry metadata storage is unavailable. Configure DATABASE_URL or Upstash Redis."
            : message,
      },
      { status: message === "fetch failed" ? 503 : 500 }
    );
  }
}

/** GET = get current user's org */
export async function GET() {
  if (!isSaasMode()) {
    return NextResponse.json(
      { error: "Not available in self-hosted mode" },
      { status: 404 }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as { username?: string }).username;
  if (!username) {
    return NextResponse.json({ org: null });
  }

  let orgSlug: string | null;
  let orgs: string[];
  try {
    [orgSlug, orgs] = await Promise.all([
      getOrgForUser(username),
      getOrgsForUser(username),
    ]);
  } catch {
    return storageUnavailableResponse();
  }

  return NextResponse.json(
    { org: orgSlug, orgs },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

/** DELETE = delete the current org (SaaS mode only, admin role required) */
export async function DELETE(request: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json(
      { error: "Not available in self-hosted mode" },
      { status: 404, headers: noStoreHeaders() }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  const username = (session.user as { username?: string }).username;
  if (!username) {
    return NextResponse.json(
      { error: "Username required" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  let body: { slug?: unknown; confirm?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const requestedSlug = normalizeOrgSlug(body.slug);
  const confirmation = normalizeOrgSlug(body.confirm);
  const contextOrgSlug = await getOrgSlug();
  const orgSlug = contextOrgSlug || requestedSlug;

  if (!orgSlug) {
    return NextResponse.json(
      { error: "No organization selected" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const validation = validateOrgSlug(orgSlug);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message },
      { status: validation.status, headers: noStoreHeaders() }
    );
  }

  if ((requestedSlug && requestedSlug !== orgSlug) || confirmation !== orgSlug) {
    return NextResponse.json(
      { error: `Type "${orgSlug}" to confirm organization deletion` },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const authz = await authorize(username, "org:delete", orgSlug);
  if (!authz.allowed) {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  const settings = await getSettings(orgSlug);
  if (!settings) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404, headers: noStoreHeaders() }
    );
  }

  let storageObjectsDeleted = 0;
  let subscriptionCanceled = false;
  try {
    subscriptionCanceled = await cancelStripeSubscription(orgSlug);
    storageObjectsDeleted = await deleteManagedStorageObjects(orgSlug);
    const deleted = await deleteOrg(orgSlug);
    if (!deleted) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404, headers: noStoreHeaders() }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete organization";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  await appendAuditEvent({
    actor: username,
    action: "org.deleted",
    target_type: "org",
    target_id: orgSlug,
    metadata: {
      name: settings.org_name ?? orgSlug,
      storage_objects_deleted: storageObjectsDeleted,
      subscription_canceled: subscriptionCanceled,
    },
  });

  const response = NextResponse.json(
    {
      deleted: true,
      slug: orgSlug,
      path: "/create-org",
      storage_objects_deleted: storageObjectsDeleted,
      subscription_canceled: subscriptionCanceled,
    },
    { headers: noStoreHeaders() }
  );
  response.cookies.delete("intertool.org");
  return response;
}
