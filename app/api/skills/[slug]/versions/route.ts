import { NextRequest, NextResponse } from "next/server";
import { getSkillBySlug, getSkillVersions } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { noStoreHeaders } from "@/lib/cache-control";
import { apiError } from "@/lib/api-utils";
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
  if (
    !skill ||
    !canViewRegistryItem(skill, {
      username: authResult.username,
      role: authResult.role,
    })
  ) {
    return apiError("Skill not found", 404);
  }

  const versions = await getSkillVersions(slug);
  return NextResponse.json(versions, { headers: noStoreHeaders() });
}
