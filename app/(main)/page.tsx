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
  ["Claude Code", "frontend-design", "approved"],
  ["Codex", "review-audit", "pending"],
  ["Cursor", "mcp-github", "approved"],
  ["Copilot", "release-plan", "approved"],
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
        <ControlPlaneBackdrop />
        <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:py-20 lg:grid-cols-[1fr_360px] lg:items-end lg:py-24">
          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Package className="h-3 w-3" aria-hidden="true" />
              Private control plane for AI agent capabilities
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-foreground sm:text-5xl lg:text-6xl">
              Stop agent-tool sprawl before it becomes production risk.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Intertool gives engineering teams one approved place to publish,
              review, version, and install AI agent skills, MCP servers, prompt
              templates, and internal tools across Claude, Codex, Cursor, and
              custom agents.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/docs/getting-started" className="btn-pill-lg">
                Deploy self-hosted
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className="btn-pill-lg bg-background/70">
                View pricing
              </Link>
            </div>
            <div className="mt-7 grid max-w-2xl gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              {[
                "S3-backed storage",
                "OAuth and RBAC",
                "Review queue and audit log",
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

          <div className="relative z-10 rounded-lg border border-border/70 bg-background/85 p-3 shadow-[0_18px_50px_rgb(0_0_0/0.08)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-medium">Capability rollout</p>
                <p className="text-[11px] text-muted-foreground">
                  Approved installs by surface
                </p>
              </div>
              <span className="rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                live
              </span>
            </div>
            <div className="space-y-1.5">
              {agentRows.map(([surface, item, status]) => (
                <div
                  key={`${surface}-${item}`}
                  className="grid grid-cols-[96px_1fr_70px] items-center gap-2 rounded-md border border-border-subtle bg-muted/25 px-2.5 py-2 text-[11px]"
                >
                  <span className="text-muted-foreground">{surface}</span>
                  <span className="truncate font-mono">{item}</span>
                  <span
                    className={
                      status === "approved"
                        ? "text-success"
                        : "text-amber-600 dark:text-amber-400"
                    }
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-border-subtle bg-foreground px-3 py-2 font-mono text-[11px] text-background">
              npx intertool install @platform/review-audit
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-3 md:grid-cols-3">
          {marketSignals.map((signal) => (
            <a
              key={signal.label}
              href={signal.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-border/70 bg-surface p-4 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl font-semibold">{signal.value}</p>
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

      <section className="border-y border-border-subtle bg-muted/20">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Why now
            </p>
            <h2 className="max-w-md text-2xl font-semibold leading-tight sm:text-3xl">
              Agent capability management is becoming a platform problem.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Teams are no longer choosing one assistant. They are wiring tools,
              skills, prompts, and MCP servers into every development surface.
              The missing layer is a private source of truth for what is safe,
              current, and approved to install.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {platformProof.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-lg border border-border/70 bg-background p-4"
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
            <h2 className="max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
              One registry for the artifacts your agents actually use.
            </h2>
          </div>
          <Link href="/docs" className="btn-ghost self-start sm:self-auto">
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
              <li>Skills live in personal folders and stale docs.</li>
              <li>MCP configs are copied between projects without review.</li>
              <li>
                Prompt templates drift across Slack, repos, and notebooks.
              </li>
              <li>Security teams cannot see what agents can discover.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface p-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              With Intertool
            </p>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              <li>
                Every capability has an owner, status, version, and files.
              </li>
              <li>
                Teams install from approved commands instead of guesswork.
              </li>
              <li>
                Reviewers can approve, reject, and audit the rollout path.
              </li>
              <li>
                Platform teams keep private tools out of public registries.
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
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Built for the messy middle between public marketplaces and one-off
              local files.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-lg border border-border/70 bg-background p-4"
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
            <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
              Start open source. Pay when governance becomes business-critical.
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
          <Link href="/pricing" className="btn-pill-lg">
            Compare all plans
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ControlPlaneBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:56px_56px] opacity-70" />
      <div className="absolute right-0 top-8 hidden w-[58rem] max-w-none opacity-45 lg:block">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-md border border-border-subtle bg-background/70"
            />
          ))}
        </div>
      </div>
    </div>
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
        className={`mt-4 min-h-16 text-sm leading-6 ${
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
