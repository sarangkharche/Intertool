import { NextRequest, NextResponse } from "next/server";
import { getSkillBySlug } from "@/lib/registry";
import { apiError } from "@/lib/api-utils";
import { trackDownload } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { noStoreHeaders } from "@/lib/cache-control";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { canViewRegistryItem } from "@/lib/registry-access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) {
    return apiError("Skill not found", 404);
  }
  if (
    !canViewRegistryItem(skill, {
      username: authResult.username,
      role: authResult.role,
    })
  ) {
    return apiError("Skill not found", 404);
  }

  // Track download (fire-and-forget)
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  trackDownload(slug, settings).catch(() => {});

  return new NextResponse(skill.readme, {
    headers: noStoreHeaders({
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    }),
  });
}
