import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { getOrgSlug } from "@/lib/org";
import { getSettings, saveSettings } from "@/lib/settings";
import { getPlan, PLAN_DEFINITIONS, type PlanId } from "@/lib/plans";
import { appendAuditEvent } from "@/lib/audit-log";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function isPlanId(value: unknown): value is PlanId {
  return (
    value === "free" ||
    value === "team" ||
    value === "business" ||
    value === "enterprise"
  );
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  const plan = getPlan(settings);

  return NextResponse.json(
    {
      plan: plan.id,
      label: plan.label,
      limits: plan.limits,
      subscription_status: settings?.subscription_status ?? "trialing",
      plans: PLAN_DEFINITIONS,
    },
    { headers: noStoreHeaders() }
  );
}

export async function PATCH(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  if (authResult.role !== "owner") {
    return NextResponse.json(
      { error: "Only owners can change billing plan state" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  let body: {
    plan?: unknown;
    subscription_status?: "trialing" | "active" | "past_due" | "canceled";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  if (!isPlanId(body.plan)) {
    return NextResponse.json(
      { error: "plan must be free, team, business, or enterprise" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  if (!settings) {
    return NextResponse.json(
      { error: "Organization settings not found" },
      { status: 404, headers: noStoreHeaders() }
    );
  }

  const nextSettings = {
    ...settings,
    plan: body.plan,
    subscription_status: body.subscription_status ?? settings.subscription_status,
  };
  await saveSettings(nextSettings, orgSlug);
  await appendAuditEvent({
    org_slug: orgSlug,
    actor: authResult.username,
    action: "org.settings.updated",
    target_type: "org",
    target_id: orgSlug ?? "default",
    metadata: {
      plan: body.plan,
      subscription_status: nextSettings.subscription_status ?? "trialing",
    },
  });

  return NextResponse.json(
    {
      plan: body.plan,
      subscription_status: nextSettings.subscription_status,
    },
    { headers: noStoreHeaders() }
  );
}
