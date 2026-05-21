import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { authorize } from "@/lib/rbac";
import { getOrgSlug } from "@/lib/org";
import { listAuditEvents } from "@/lib/audit-log";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const orgSlug = await getOrgSlug();
  const authz = await authorize(
    authResult.username,
    "settings:manage",
    orgSlug
  );
  if (!authz.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return NextResponse.json(
      { error: "limit must be an integer between 1 and 1000" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const events = await listAuditEvents(orgSlug, limit);
  return NextResponse.json({ events }, { headers: noStoreHeaders() });
}
