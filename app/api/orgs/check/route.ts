import { NextRequest, NextResponse } from "next/server";
import { isLocalSaasFallbackMode, isSaasMode } from "@/lib/org";
import { orgExists } from "@/lib/settings";
import { hasControlPlane } from "@/lib/control-plane";
import { normalizeOrgSlug, validateOrgSlug } from "@/lib/org-slugs";

function hasRedis(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export const dynamic = "force-dynamic";

function metadataUnavailableResponse() {
  return NextResponse.json(
    {
      available: false,
      reason:
        "Registry metadata storage is unavailable. Configure DATABASE_URL or Upstash Redis.",
    },
    { status: 503 }
  );
}

/** GET /api/orgs/check?slug=xxx — check slug availability (no auth required) */
export async function GET(request: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const slug = normalizeOrgSlug(request.nextUrl.searchParams.get("slug"));
  const validation = validateOrgSlug(slug);
  if (!validation.ok) {
    return NextResponse.json({
      available: false,
      reason: validation.reason,
    });
  }

  if (!hasControlPlane() && !hasRedis() && !isLocalSaasFallbackMode()) {
    return metadataUnavailableResponse();
  }

  let exists = false;
  try {
    exists = await orgExists(slug);
  } catch {
    return metadataUnavailableResponse();
  }

  if (exists) {
    return NextResponse.json({ available: false, reason: "Already taken" });
  }

  return NextResponse.json(
    { available: true },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
