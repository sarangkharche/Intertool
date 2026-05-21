import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSaasMode } from "@/lib/org";
import { createOrg, orgExists, getOrgForUser } from "@/lib/settings";

export const dynamic = "force-dynamic";

function storageUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "Registry storage is unavailable. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    },
    { status: 503 }
  );
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

  let reqBody: { slug: string; name: string };
  try {
    reqBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { slug, name } = reqBody;

  if (!slug || !name) {
    return NextResponse.json(
      { error: "slug and name are required" },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      {
        error: "Slug must be 3-40 lowercase alphanumeric characters or hyphens",
      },
      { status: 400 }
    );
  }

  // Reserved slugs
  const reserved = [
    "www",
    "api",
    "app",
    "admin",
    "auth",
    "billing",
    "brand",
    "browse",
    "create-org",
    "dashboard",
    "design-system",
    "docs",
    "help",
    "invite",
    "login",
    "publish",
    "review",
    "search",
    "settings",
    "signup",
    "sign-in",
    "sign-up",
    "skills",
    "status",
    "support",
    "teams",
  ];
  if (reserved.includes(slug)) {
    return NextResponse.json(
      { error: "This name is reserved" },
      { status: 409 }
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
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
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
            ? "Registry storage is unavailable. Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
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
  try {
    orgSlug = await getOrgForUser(username);
  } catch {
    return storageUnavailableResponse();
  }

  return NextResponse.json(
    { org: orgSlug },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
