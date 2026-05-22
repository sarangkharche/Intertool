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
        <div className="mx-auto grid min-h-[620px] max-w-6xl gap-12 px-4 py-16 sm:py-20 lg:min-h-[660px] lg:grid-cols-[minmax(0,0.9fr)_420px] lg:items-center lg:gap-20 lg:py-12">
          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs text-success shadow-sm backdrop-blur">
              <Package className="h-3 w-3" aria-hidden="true" />
              Private agent registry
            </div>
            <h1 className="text-display text-4xl leading-[1.02] text-foreground sm:text-5xl lg:text-6xl">
              Govern agent capabilities.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Approve skills, MCP servers, and tools before they reach your
              teams.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs/getting-started"
                className="btn-pill-lg min-h-11 w-full justify-center border-success/35 bg-success/10 text-success hover:border-success/45 hover:bg-success/15 sm:w-auto"
              >
                Deploy self-hosted
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="#where-it-fits"
                className="btn-pill-lg min-h-11 w-full justify-center bg-background/70 sm:w-auto"
              >
                Where it fits
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 lg:items-end">
            <div className="lg:mr-8">
              <HeroLogoMark />
            </div>

            <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-border-subtle border-t-success/35 bg-surface/80 p-5">
              <div className="mb-5 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium">Capability rollout</p>
                  <p className="text-[11px] text-muted-foreground">
                    Agent access
                  </p>
                </div>
                <span className="rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                  live
                </span>
              </div>
              <div className="space-y-2">
                {agentRows.map(([surface, item, status]) => (
                  <div
                    key={`${surface}-${item}`}
                    className="grid grid-cols-[minmax(72px,96px)_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border-subtle bg-background/45 px-3 py-2.5 text-[11px]"
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
              <div className="mt-4 overflow-x-auto rounded-md border border-border-subtle bg-foreground px-3 py-2.5 font-mono text-[11px] text-background">
                intertool install @platform/internal-mcp
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid border-y border-border-subtle md:grid-cols-3 md:divide-x md:divide-border-subtle">
          {marketSignals.map((signal) => (
            <a
              key={signal.label}
              href={signal.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group py-6 transition-colors hover:bg-muted/20 focus-ring md:px-6 md:first:pl-0 md:last:pr-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {signal.value}
                </p>
                <ExternalLink
                  className="mt-1 h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-success"
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
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
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

function HeroLogoMark() {
  return (
    <svg
      aria-hidden="true"
      data-hero-logo-mark
      className="pointer-events-none h-24 w-24 overflow-visible sm:h-28 sm:w-28 lg:h-32 lg:w-32"
      viewBox="0 0 120 120"
      fill="none"
    >
      <rect
        x="22"
        y="18"
        width="76"
        height="76"
        rx="19"
        className="stroke-success/25"
      />
      <path
        d="M40 40 60 29l20 11-20 11-20-11Z"
        className="stroke-foreground/55"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 40v24l20 11V51L40 40Z"
        className="stroke-foreground/55"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 40v24L60 75V51l20-11Z"
        className="stroke-foreground/55"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M49 45 69 34"
        className="stroke-foreground/20"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="91" cy="21" r="2.2" className="fill-success" />
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
