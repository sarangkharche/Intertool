import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSkillBySlug } from "@/lib/registry";
import { apiError } from "@/lib/api-utils";
import { trackDownload } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const apiKey = process.env.INTERTOOL_API_KEY;
  const authHeader = request.headers.get("authorization");
  const hasApiKey = apiKey && authHeader === `Bearer ${apiKey}`;

  // Require either a valid session or a valid API key (not skip when key is unset)
  if (!session?.user && !hasApiKey) {
    return apiError("Unauthorized", 401);
  }
  if (!session?.user && !apiKey) {
    return apiError("Unauthorized", 401);
  }

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) {
    return apiError("Skill not found", 404);
  }

  // Track download (fire-and-forget)
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  trackDownload(slug, settings).catch(() => {});

  return new NextResponse(skill.readme, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
