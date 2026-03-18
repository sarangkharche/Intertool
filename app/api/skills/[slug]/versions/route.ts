import { NextRequest, NextResponse } from "next/server";
import { getSkillVersions } from "@/lib/registry";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const versions = await getSkillVersions(slug);
  return NextResponse.json(versions);
}
