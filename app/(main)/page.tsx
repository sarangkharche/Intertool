import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSaasMode, getOrgSlug } from "@/lib/org";
import { getOrgForUser } from "@/lib/settings";
import {
  capabilityPillars,
  marketSignals,
  platformProof,
  pricingPlans,
  useCases,
} from "@/lib/marketing";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Package,
  ShieldCheck,
} from "lucide-react";

const agentRows = [
  ["Claude", "brand-guidelines", "approved"],
  ["Codex", "deploy-review", "approved"],
  ["Cursor", "internal-mcp", "review"],
  ["Copilot", "release-agent", "approved"],
];

export default async function HomePage() {
  const session = await auth();
  const orgSlug = await getOrgSlug();

  if (session?.user) {
    const username = (session.user as { username?: string }).username;

    // In an org path context, go to that org's dashboard.
    if (orgSlug) {
      redirect(`/${orgSlug}/dashboard`);
    }

    // On the root path in SaaS mode: route based on org membership.
    if (isSaasMode() && username) {
      let userOrg: string | null = null;
      try {
        userOrg = await getOrgForUser(username);
      } catch {
        // Redis not configured locally: fall through to create-org
      }
      if (userOrg) {
        redirect(`/${userOrg}/dashboard`);
      }
      // User has no org: send them to create one
      redirect("/create-org");
    }

    // Self-hosted or non-SaaS: go to dashboard
    redirect("/dashboard");
  }

  const featuredPlan = pricingPlans.find((plan) => plan.featured);

  return (
    <div className="overflow-hidden">
      <section className="relative isolate border-b border-border-subtle">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1fr_360px] lg:items-end lg:py-24">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Package className="h-3 w-3" aria-hidden="true" />
              Approval layer for Claude, Codex, Cursor, and MCP
            </div>
            <h1 className="text-display max-w-3xl text-4xl leading-[1.02] text-foreground sm:text-5xl lg:text-6xl">
              Own the agent capabilities your teams are allowed to use.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Claude and Codex can run skills. Cursor and Copilot can use MCP.
              Intertool is the private registry that decides what is approved,
              versioned, and installable across all of them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs/getting-started"
                className="btn-pill-lg min-h-11 w-full justify-center sm:w-auto"
              >
                Deploy self-hosted
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="#where-it-fits"
                className="btn-pill-lg min-h-11 w-full justify-center bg-background/70 sm:w-auto"
              >
                See where it fits
              </Link>
            </div>
            <div className="mt-7 grid max-w-2xl gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              {[
                "Cross-agent registry",
                "Review and audit trail",
                "Self-hosted or managed",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-success"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 overflow-hidden rounded-xl border border-border/70 bg-surface/90 p-4 shadow-[0_24px_80px_rgb(0_0_0/0.18)]">
            <RegistryPanelArt />
            <div className="relative z-10 mb-4 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-medium">Capability rollout</p>
                <p className="text-[11px] text-muted-foreground">
                  Approved by agent surface
                </p>
              </div>
              <span className="rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                live
              </span>
            </div>
            <div className="relative z-10 space-y-1.5">
              {agentRows.map(([surface, item, status]) => (
                <div
                  key={`${surface}-${item}`}
                  className="grid grid-cols-[minmax(72px,96px)_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border-subtle bg-background/55 px-2.5 py-2 text-[11px] backdrop-blur"
                >
                  <span className="text-muted-foreground">{surface}</span>
                  <span className="truncate font-mono">{item}</span>
                  <span
                    className={
                      status === "approved" ? "text-success" : "text-warning"
                    }
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative z-10 mt-3 overflow-x-auto rounded-md border border-border-subtle bg-foreground px-3 py-2 font-mono text-[11px] text-background">
              intertool install @platform/internal-mcp
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid border-y border-border-subtle md:grid-cols-3 md:divide-x md:divide-border-subtle">
          {marketSignals.map((signal) => (
            <a
              key={signal.label}
              href={signal.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group py-5 transition-colors hover:bg-muted/20 focus-ring md:px-5 md:first:pl-0 md:last:pr-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {signal.value}
                </p>
                <ExternalLink
                  className="mt-1 h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {signal.label}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {signal.source}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section
        id="where-it-fits"
        className="scroll-mt-16 border-y border-border-subtle bg-muted/20"
      >
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Where it fits
            </p>
            <h2 className="text-display max-w-md text-2xl leading-tight sm:text-3xl">
              Claude and Codex run capabilities. Intertool governs them.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Native skill stores are useful inside one platform. Engineering
              teams still need a vendor-neutral source of truth for what is
              safe, current, private, and approved across every agent surface.
            </p>
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            {platformProof.map((item) => (
              <div
                key={item}
                className="flex gap-3 border-t border-border-subtle py-4"
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Product
            </p>
            <h2 className="text-display max-w-xl text-2xl leading-tight sm:text-3xl">
              One approval workflow for the artifacts agents actually run.
            </h2>
          </div>
          <Link
            href="/docs"
            className="btn-ghost min-h-11 self-start sm:self-auto"
          >
            Read the docs
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {capabilityPillars.map((pillar) => (
            <div key={pillar.title} className="border-t border-border pt-4">
              <pillar.icon
                className="mb-4 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-border/70 bg-foreground p-5 text-background">
            <p className="mb-3 text-xs font-medium text-background/60">
              Before Intertool
            </p>
            <ul className="space-y-3 text-sm leading-6 text-background/80">
              <li>Skills are approved separately in each AI platform.</li>
              <li>MCP configs are copied into repos without a clear owner.</li>
              <li>
                Prompt templates drift across Slack, repos, and notebooks.
              </li>
              <li>Security cannot answer which capabilities are live.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface p-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              With Intertool
            </p>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              <li>
                Every capability has an owner, status, version, and risk signal.
              </li>
              <li>
                Developers install approved artifacts instead of copied
                snippets.
              </li>
              <li>
                Reviewers can approve, archive, and audit the rollout path.
              </li>
              <li>
                Platform teams keep private tools out of public marketplaces.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Use cases
            </p>
            <h2 className="text-display text-2xl leading-tight sm:text-3xl">
              Built for the gap between native agent stores and public
              marketplaces.
            </h2>
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="border-t border-border-subtle py-5"
              >
                <useCase.icon
                  className="mb-4 h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold">{useCase.title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Pricing
            </p>
            <h2 className="text-display text-2xl leading-tight sm:text-3xl">
              Start open source. Pay when agent governance becomes
              infrastructure.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Pricing is designed around the rollout path most teams follow:
              prove value self-hosted, move to managed team workflows, then add
              deployment and procurement support when the registry becomes
              company infrastructure.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PricingPreview plan={pricingPlans[0]} />
            {featuredPlan && <PricingPreview plan={featuredPlan} />}
          </div>
        </div>
        <div className="mt-8">
          <Link href="/pricing" className="btn-pill-lg min-h-11">
            Compare all plans
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function RegistryPanelArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-10 top-4 h-48 w-48 text-border"
      viewBox="0 0 180 180"
      fill="none"
    >
      <rect
        x="34"
        y="28"
        width="112"
        height="112"
        rx="28"
        className="stroke-border-subtle"
      />
      <rect
        x="44"
        y="38"
        width="112"
        height="112"
        rx="28"
        className="stroke-border-subtle/70"
      />
      <rect
        x="54"
        y="48"
        width="112"
        height="112"
        rx="28"
        className="stroke-border-subtle/40"
      />
      <path
        d="M78 66 116 87.5v42L78 108V66Z"
        className="stroke-muted-foreground/45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M78 66 116 44.5 154 66 116 87.5 78 66Z"
        className="stroke-muted-foreground/45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M154 66v42l-38 21.5v-42L154 66Z"
        className="stroke-muted-foreground/45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M96 76.5 134 55"
        className="stroke-muted-foreground/30"
        strokeLinecap="round"
      />
      <circle cx="58" cy="126" r="4" className="fill-success/80" />
      <circle cx="138" cy="34" r="3" className="fill-success/60" />
      <circle cx="158" cy="118" r="3" className="fill-primary/55" />
      <path
        d="M60 126c18-20 34-26 56-18 18 6 29 2 42-14"
        className="stroke-success/25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PricingPreview({ plan }: { plan: (typeof pricingPlans)[number] }) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        plan.featured
          ? "border-foreground bg-foreground text-background"
          : "border-border/70 bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-[11px] font-medium uppercase ${
              plan.featured ? "text-background/55" : "text-muted-foreground"
            }`}
          >
            {plan.eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-semibold">{plan.name}</h3>
        </div>
        <plan.icon
          className={`h-5 w-5 ${
            plan.featured ? "text-background/55" : "text-muted-foreground"
          }`}
          aria-hidden="true"
        />
      </div>
      <div className="mt-5">
        <span className="text-3xl font-semibold">{plan.price}</span>
        <p
          className={`mt-1 text-xs ${
            plan.featured ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          {plan.cadence}
        </p>
      </div>
      <p
        className={`mt-4 text-sm leading-6 md:min-h-16 ${
          plan.featured ? "text-background/75" : "text-muted-foreground"
        }`}
      >
        {plan.description}
      </p>
      <ul className="mt-5 space-y-2">
        {plan.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex gap-2 text-xs">
            <Check
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                plan.featured ? "text-background/70" : "text-success"
              }`}
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
