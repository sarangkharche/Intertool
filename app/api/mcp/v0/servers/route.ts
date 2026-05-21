import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { getOrgSlug } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { getSkills } from "@/lib/registry";
import { mcpRegistryServer } from "@/lib/distribution";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const orgSlug = await getOrgSlug();
  const [settings, result] = await Promise.all([
    getSettings(orgSlug),
    getSkills({
      type: "mcp-server",
      page: 1,
      limit: 100,
      sort: "newest",
    }),
  ]);

  return NextResponse.json(
    {
      servers: result.skills.map((skill) =>
        mcpRegistryServer(skill, settings, request.nextUrl.origin, orgSlug)
      ),
      metadata: {
        count: result.skills.length,
        total: result.total,
      },
    },
    { headers: noStoreHeaders() }
  );
}
