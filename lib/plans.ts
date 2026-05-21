import type { RegistrySettings } from "./settings";

export type PlanId = "free" | "team" | "business" | "enterprise";

export interface PlanLimits {
  members: number | null;
  registryItems: number | null;
  publishReviewRequired: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  label: string;
  limits: PlanLimits;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    limits: {
      members: 3,
      registryItems: 10,
      publishReviewRequired: true,
    },
  },
  team: {
    id: "team",
    label: "Team",
    limits: {
      members: 25,
      registryItems: 100,
      publishReviewRequired: false,
    },
  },
  business: {
    id: "business",
    label: "Business",
    limits: {
      members: 250,
      registryItems: 1000,
      publishReviewRequired: false,
    },
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    limits: {
      members: null,
      registryItems: null,
      publishReviewRequired: false,
    },
  },
};

export function getPlanId(settings: RegistrySettings | null): PlanId {
  return settings?.plan ?? "free";
}

export function getPlan(settings: RegistrySettings | null): PlanDefinition {
  return PLAN_DEFINITIONS[getPlanId(settings)];
}

export function limitExceeded(
  current: number,
  limit: number | null,
  nextCount = current + 1
): boolean {
  return limit !== null && nextCount > limit;
}
