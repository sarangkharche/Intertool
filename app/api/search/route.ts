import { NextRequest, NextResponse } from "next/server";
import { searchSkills } from "@/lib/registry";
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

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return apiError("Query parameter 'q' is required", 400);
  }

  const results = await searchSkills(query);
  return NextResponse.json(results, {
    headers: noStoreHeaders(rateLimitHeaders(rl)),
  });
}
