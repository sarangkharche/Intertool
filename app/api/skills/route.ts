import { NextRequest, NextResponse } from "next/server";
import { getSkills } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import {
  checkRateLimit,
  rateLimitResponse,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  // Rate limit: 120 requests per minute per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`skills:${ip}`, {
    limit: 120,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const params = request.nextUrl.searchParams;

  const rawPage = params.get("page");
  const rawPerPage = params.get("per_page") ?? params.get("limit");
  const page = rawPage ? Number(rawPage) : 1;
  const perPage = rawPerPage ? Number(rawPerPage) : 20;

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json(
      { error: "page must be a positive integer" },
      { status: 400, headers: noStoreHeaders(rateLimitHeaders(rl)) }
    );
  }

  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    return NextResponse.json(
      { error: "per_page must be an integer between 1 and 100" },
      { status: 400, headers: noStoreHeaders(rateLimitHeaders(rl)) }
    );
  }

  const filters: SearchFilters = {
    query: params.get("q") ?? undefined,
    type: (params.get("type") as SkillType) ?? undefined,
    category: params.get("category") ?? undefined,
    tag: params.get("tag") ?? undefined,
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

  const headers: Record<string, string> = noStoreHeaders(rateLimitHeaders(rl));
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
