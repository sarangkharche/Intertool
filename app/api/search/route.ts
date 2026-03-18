import { NextRequest, NextResponse } from "next/server";
import { searchSkills } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json([]);
  }

  const results = await searchSkills(query);
  return NextResponse.json(results);
}
