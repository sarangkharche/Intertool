import { NextRequest, NextResponse } from "next/server";
import { searchSkills } from "@/lib/registry";
import type { SkillType } from "@/lib/types";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { apiError } from "@/lib/api-utils";
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

  // Rate limit: 60 searches per minute per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`search:${ip}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? "";
  const type = params.get("type") as SkillType | null;
  const category = params.get("category") ?? undefined;
  const tag = params.get("tag") ?? undefined;
  const author = params.get("author") ?? undefined;
  const rawLimit = params.get("limit");
  const limit = rawLimit ? Number(rawLimit) : 20;

  if (!query && !type && !category && !tag && !author) {
    return apiError(
      "Query parameter 'q' or at least one filter is required",
      400
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return apiError("limit must be an integer between 1 and 100", 400);
  }

  const results = await searchSkills(query, {
    type: type ?? undefined,
    category,
    tag,
    author,
    limit,
  });
  return NextResponse.json(results, {
    headers: noStoreHeaders(rateLimitHeaders(rl)),
  });
}
