import { NextRequest, NextResponse } from "next/server";
import { getSkillVersions } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug } = await params;
  const versions = await getSkillVersions(slug);
  return NextResponse.json(versions);
}
