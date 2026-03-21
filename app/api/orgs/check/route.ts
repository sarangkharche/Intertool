import { NextRequest, NextResponse } from "next/server";
import { isSaasMode } from "@/lib/org";
import { orgExists } from "@/lib/settings";

function hasRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const RESERVED_SLUGS = [
  "www", "api", "app", "admin", "dashboard", "docs", "help",
  "support", "status", "billing", "settings", "auth", "login",
  "signup", "sign-in", "sign-up", "create-org",
];

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const dynamic = "force-dynamic";

/** GET /api/orgs/check?slug=xxx — check slug availability (no auth required) */
export async function GET(request: NextRequest) {
  if (!isSaasMode()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const slug = request.nextUrl.searchParams.get("slug")?.toLowerCase().trim();
  if (!slug) {
    return NextResponse.json({ available: false, reason: "Slug is required" });
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({
      available: false,
      reason: "Must be 3-40 lowercase letters, numbers, or hyphens",
    });
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({ available: false, reason: "This name is reserved" });
  }

  if (!hasRedis()) {
    // No Redis configured: skip existence check, validated format + reserved is enough
    return NextResponse.json({ available: true });
  }

  const exists = await orgExists(slug);
  if (exists) {
    return NextResponse.json({ available: false, reason: "Already taken" });
  }

  return NextResponse.json({ available: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
