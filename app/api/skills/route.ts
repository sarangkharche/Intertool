import { NextRequest, NextResponse } from "next/server";
import { getSkills } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { checkRateLimit, rateLimitResponse, rateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  // Rate limit: 120 requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`skills:${ip}`, { limit: 120, windowSeconds: 60 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const params = request.nextUrl.searchParams;

  const page = params.get("page") ? Number(params.get("page")) : 1;
  const perPage = params.get("per_page")
    ? Number(params.get("per_page"))
    : params.get("limit")
      ? Number(params.get("limit"))
      : 20;

  const filters: SearchFilters = {
    query: params.get("q") ?? undefined,
    type: (params.get("type") as SkillType) ?? undefined,
    category: params.get("category") ?? undefined,
    author: params.get("author") ?? undefined,
    sort: (params.get("sort") as SearchFilters["sort"]) ?? "newest",
    page,
    limit: perPage,
  };

  const result = await getSkills(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  // Build Link header
  const baseUrl = request.nextUrl.clone();
  const links: string[] = [];
  if (page < totalPages) {
    baseUrl.searchParams.set("page", String(page + 1));
    links.push(`<${baseUrl.pathname}${baseUrl.search}>; rel="next"`);
  }
  if (page > 1) {
    baseUrl.searchParams.set("page", String(page - 1));
    links.push(`<${baseUrl.pathname}${baseUrl.search}>; rel="prev"`);
  }

  const headers: Record<string, string> = {
    ...rateLimitHeaders(rl),
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  };
  if (links.length > 0) headers["Link"] = links.join(", ");

  return NextResponse.json(
    {
      skills: result.skills,
      total: result.total,
      page,
      per_page: perPage,
      total_pages: totalPages,
    },
    { headers }
  );
}
