import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  cpFindOrgByStripeCustomer,
  cpFindOrgByStripeSubscription,
  hasControlPlane,
} from "@/lib/control-plane";
import { getSettings, saveSettings } from "@/lib/settings";
import { appendAuditEvent } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";
import type { PlanId } from "@/lib/plans";

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

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status | undefined
): "trialing" | "active" | "past_due" | "canceled" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

function stringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function resolveOrgSlug(input: {
  metadata?: Stripe.Metadata | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  const metadataOrg = input.metadata?.org_slug;
  if (metadataOrg) return metadataOrg;

  if (hasControlPlane() && input.subscriptionId) {
    const orgSlug = await cpFindOrgByStripeSubscription(input.subscriptionId);
    if (orgSlug) return orgSlug;
  }

  if (hasControlPlane() && input.customerId) {
    const orgSlug = await cpFindOrgByStripeCustomer(input.customerId);
    if (orgSlug) return orgSlug;
  }

  return null;
}

async function updateOrgBilling(input: {
  orgSlug: string;
  plan?: unknown;
  subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled";
  customerId?: string | null;
  subscriptionId?: string | null;
  actor: string;
}): Promise<void> {
  const settings = await getSettings(input.orgSlug);
  if (!settings) return;

  const nextPlan = isPlanId(input.plan) ? input.plan : settings.plan;
  const nextSettings = {
    ...settings,
    plan: nextPlan,
    subscription_status:
      input.subscriptionStatus ?? settings.subscription_status ?? "trialing",
    stripe_customer_id: input.customerId ?? settings.stripe_customer_id,
    stripe_subscription_id:
      input.subscriptionId ?? settings.stripe_subscription_id,
  };

  await saveSettings(nextSettings, input.orgSlug);
  await appendAuditEvent({
    org_slug: input.orgSlug,
    actor: input.actor,
    action: "org.settings.updated",
    target_type: "org",
    target_id: input.orgSlug,
    metadata: {
      billing: true,
      plan: nextSettings.plan ?? null,
      subscription_status: nextSettings.subscription_status ?? null,
      stripe_subscription_id: nextSettings.stripe_subscription_id ?? null,
    },
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = stringId(session.subscription);
      const customerId = stringId(session.customer);
      const orgSlug = await resolveOrgSlug({
        metadata: session.metadata,
        subscriptionId,
        customerId,
      });
      if (orgSlug) {
        await updateOrgBilling({
          orgSlug,
          plan: session.metadata?.plan,
          subscriptionStatus: "active",
          customerId,
          subscriptionId,
          actor: "stripe",
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgSlug = await resolveOrgSlug({
        metadata: subscription.metadata,
        subscriptionId: subscription.id,
        customerId: stringId(subscription.customer),
      });
      if (orgSlug) {
        await updateOrgBilling({
          orgSlug,
          plan:
            event.type === "customer.subscription.deleted"
              ? "free"
              : subscription.metadata?.plan,
          subscriptionStatus:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : mapSubscriptionStatus(subscription.status),
          customerId: stringId(subscription.customer),
          subscriptionId: subscription.id,
          actor: "stripe",
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
