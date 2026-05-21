import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { apiError } from "@/lib/api-utils";
import { getOrgSlug } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { getSkillBySlug } from "@/lib/registry";
import { mcpRegistryServer } from "@/lib/distribution";
import { noStoreHeaders } from "@/lib/cache-control";

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
  if (!skill || skill.type !== "mcp-server" || skill.status !== "published") {
    return apiError("MCP server not found", 404);
  }

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  return NextResponse.json(
    mcpRegistryServer(skill, settings, request.nextUrl.origin, orgSlug),
    { headers: noStoreHeaders() }
  );
}
