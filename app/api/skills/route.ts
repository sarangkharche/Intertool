import { NextRequest, NextResponse } from "next/server";
import { getSkills } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const params = request.nextUrl.searchParams;

  const filters: SearchFilters = {
    query: params.get("q") ?? undefined,
    type: (params.get("type") as SkillType) ?? undefined,
    category: params.get("category") ?? undefined,
    author: params.get("author") ?? undefined,
    sort: (params.get("sort") as SearchFilters["sort"]) ?? "newest",
    page: params.get("page") ? Number(params.get("page")) : 1,
    limit: params.get("limit") ? Number(params.get("limit")) : 20,
  };

  const result = await getSkills(filters);
  return NextResponse.json(result);
}
