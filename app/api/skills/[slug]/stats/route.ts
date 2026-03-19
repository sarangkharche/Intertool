import { NextRequest, NextResponse } from "next/server";
import { getDownloadStats } from "@/lib/analytics";
import { apiError } from "@/lib/api-utils";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug } = await params;
  if (!slug) return apiError("Slug is required", 400);

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);

  const stats = await getDownloadStats(slug, settings);
  return NextResponse.json(stats);
}
