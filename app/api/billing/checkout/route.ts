import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { getOrgSlug } from "@/lib/org";
import { getSettings, saveSettings } from "@/lib/settings";
import { orgApiPath } from "@/lib/distribution";
import { type PlanId } from "@/lib/plans";
import { getStripe, stripePriceForPlan } from "@/lib/stripe";
import { noStoreHeaders } from "@/lib/cache-control";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function publicBaseUrl(request: NextRequest): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    request.nextUrl.origin
  ).replace(/\/$/, "");
}

function isPaidPlan(value: unknown): value is Extract<PlanId, "team" | "business"> {
  return value === "team" || value === "business";
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  if (authResult.role !== "owner") {
    return NextResponse.json(
      { error: "Only owners can manage billing" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  let body: { plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  if (!isPaidPlan(body.plan)) {
    return NextResponse.json(
      { error: "plan must be team or business" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const priceId = stripePriceForPlan(body.plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price id is not configured for ${body.plan}` },
      { status: 503, headers: noStoreHeaders() }
    );
  }

  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  if (!orgSlug || !settings) {
    return NextResponse.json(
      { error: "Organization settings not found" },
      { status: 404, headers: noStoreHeaders() }
    );
  }

  const stripe = getStripe();
  let customerId = settings.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: settings.org_name ?? orgSlug,
      email: settings.admin_email || undefined,
      metadata: {
        org_slug: orgSlug,
      },
    });
    customerId = customer.id;
    await saveSettings(
      {
        ...settings,
        stripe_customer_id: customerId,
      },
      orgSlug
    );
  }

  const baseUrl = publicBaseUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${orgApiPath(orgSlug, "/settings?billing=success")}`,
    cancel_url: `${baseUrl}${orgApiPath(orgSlug, "/pricing?billing=cancelled")}`,
    metadata: {
      org_slug: orgSlug,
      plan: body.plan,
    },
    subscription_data: {
      metadata: {
        org_slug: orgSlug,
        plan: body.plan,
      },
    },
  });

  return NextResponse.json({ url: session.url }, { headers: noStoreHeaders() });
}
