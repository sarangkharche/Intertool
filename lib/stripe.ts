import Stripe from "stripe";
import type { PlanId } from "./plans";

let stripeClient: Stripe | null = null;

export function hasStripe(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });
  return stripeClient;
}

export function stripePriceForPlan(plan: PlanId): string | null {
  switch (plan) {
    case "team":
      return process.env.STRIPE_TEAM_PRICE_ID ?? null;
    case "business":
      return process.env.STRIPE_BUSINESS_PRICE_ID ?? null;
    default:
      return null;
  }
}
