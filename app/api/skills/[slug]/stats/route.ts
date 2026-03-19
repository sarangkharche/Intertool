import { NextRequest, NextResponse } from "next/server";
import { getDownloadStats } from "@/lib/analytics";
import { apiError } from "@/lib/api-utils";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return apiError("Slug is required", 400);

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);

  const stats = await getDownloadStats(slug, settings);
  return NextResponse.json(stats);
}
