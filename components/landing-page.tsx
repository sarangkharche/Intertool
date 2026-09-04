import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  History,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { CopyCommandButton } from "@/components/copy-command-button";

const claudeCommand = "/intertool:remember";

const operatingScale = [
  {
    stage: "Small teams",
    title: "Make hard-won knowledge reusable",
    description:
      "Start with one repository and capture the decisions, warnings, and runbooks the team would otherwise keep rediscovering.",
  },
  {
    stage: "Growing organisations",
    title: "Keep context precise as adoption spreads",
    description:
      "Repository and path scopes give each session relevant guidance without flattening every team's context into one generic wiki.",
  },
  {
    stage: "Enterprise",
    title: "Govern shared memory as infrastructure",
    description:
      "Tenant boundaries, role-aware administration, revocable tokens, lifecycle controls, and audit events keep rollout accountable.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Capture the learning",
    description:
      "A coding agent or engineer drafts one durable memory from the work, without uploading the conversation.",
  },
  {
    number: "02",
    title: "Review the exact wording",
    description:
      "A human confirms the source, repository scope, confidence, and expiry before publication.",
  },
  {
    number: "03",
    title: "Retrieve it in a fresh session",
    description:
      "The next authorised session asks Intertool for task-specific context and receives only relevant, published memories.",
  },
];

const guardrails = [
  {
    icon: FileCheck2,
    title: "Human approved",
    description: "No proposed memory becomes shared context by itself.",
  },
  {
    icon: GitBranch,
    title: "Repository scoped",
    description:
      "Paths and repositories keep guidance close to the work it belongs to.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolated",
    description:
      "Every team-memory read and mutation stays inside the authenticated organisation.",
  },
  {
    icon: KeyRound,
    title: "Access revocable",
    description:
      "Personal tokens keep retrieval attributable and independently revocable.",
  },
  {
    icon: History,
    title: "Lifecycle recorded",
    description:
      "Publish, dispute, archive, and token actions retain an actor and timestamp.",
  },
];

function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function LandingPage() {
  return (
    <div className="overflow-hidden bg-background">
      <section
        id="product"
        className="scroll-mt-16 border-b border-border-subtle"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="border-x border-t border-border-subtle">
            <Reveal className="px-5 py-14 text-center sm:px-8 sm:py-20">
              <h1 className="mx-auto max-w-xl text-lg leading-7 font-medium tracking-tight text-balance">
                Engineering memory for every team and every coding agent.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                Start with one repository. Scale reviewed, source-backed context
                across an organisation without losing ownership, permissions, or
                control.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/sign-in"
                  className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
                >
                  Open Intertool
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link href="#scale" className="btn-pill">
                  See how it scales
                </Link>
              </div>
            </Reveal>

            <Reveal className="border-y border-border-subtle bg-surface/35 px-4 py-5 sm:px-8 sm:py-6">
              <div className="mx-auto flex max-w-3xl items-stretch border border-border-subtle bg-background">
                <span className="hidden shrink-0 items-center border-r border-border-subtle px-4 font-mono text-[11px] text-muted-foreground sm:flex">
                  Claude Code
                </span>
                <code className="flex min-w-0 flex-1 items-center overflow-x-auto px-3 font-mono text-xs whitespace-nowrap sm:px-4">
                  {claudeCommand}
                </code>
                <CopyCommandButton value={claudeCommand} />
              </div>
              <div className="mt-3 text-center">
                <Link
                  href="/docs/getting-started"
                  className="inline-flex min-h-8 items-center gap-1.5 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-ring"
                >
                  Connect Claude Code
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>

          <div
            data-hero-placeholder
            className="mt-16 aspect-[4/3] rounded-md border border-dashed border-border-subtle bg-surface/30 sm:mt-20 sm:aspect-[16/7]"
            aria-hidden="true"
          />
        </div>
      </section>

      <section
        id="scale"
        className="scroll-mt-16 border-b border-border-subtle bg-surface/35"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <Reveal className="max-w-sm">
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Start with one team. Keep the controls as you scale.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Small teams can begin with a focused shared memory. Larger
              organisations keep the same evidence, access boundaries, and
              lifecycle as adoption expands.
            </p>
          </Reveal>

          <Reveal>
            <ol className="border-t border-border-subtle">
              {operatingScale.map((item, index) => (
                <li
                  key={item.stage}
                  className="grid gap-3 border-b border-border-subtle py-6 sm:grid-cols-[8.5rem_1fr] sm:gap-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <span className="text-xs font-medium">{item.stage}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section
        id="context"
        className="scroll-mt-16 border-b border-border-subtle"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <Reveal className="max-w-sm">
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Memory that keeps its evidence.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Every memory stays attached to an owner, a source, and the part of
              the repository where it applies. Teams can review what coding
              agents will receive before it spreads.
            </p>

            <dl className="mt-8 divide-y divide-border-subtle border-y border-border-subtle text-xs">
              <div className="flex items-center justify-between gap-6 py-3">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="font-mono">PR #1842</dd>
              </div>
              <div className="flex items-center justify-between gap-6 py-3">
                <dt className="text-muted-foreground">Path scope</dt>
                <dd className="font-mono">tests/refunds/**</dd>
              </div>
              <div className="flex items-center justify-between gap-6 py-3">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd>Confirmed by Alice</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal>
            <div
              data-media-placeholder
              className="aspect-[1365/900] rounded-md border border-dashed border-border-subtle bg-surface/30"
              aria-hidden="true"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-surface/35">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[1.28fr_0.72fr] lg:gap-16">
          <Reveal className="lg:order-1">
            <div
              data-media-placeholder
              className="aspect-[1365/900] rounded-md border border-dashed border-border-subtle bg-background/40"
              aria-hidden="true"
            />
          </Reveal>

          <Reveal className="max-w-sm lg:order-2">
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Only the right context reaches the session.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Intertool filters by organisation, repository, path, status, and
              task relevance. Draft, disputed, expired, and archived memories
              stay out of retrieval.
            </p>
            <Link
              href="/docs/development-context"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-ring"
            >
              Read the retrieval rules
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-16 border-b border-border-subtle"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <Reveal className="max-w-sm">
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Capture once. Confirm deliberately. Retrieve when it matters.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The workflow is deliberately small. Intertool stores structured
              engineering memory, not a second copy of your conversations.
            </p>
          </Reveal>

          <Reveal>
            <ol className="border-t border-border-subtle">
              {workflow.map((step) => (
                <li
                  key={step.number}
                  className="grid gap-4 border-b border-border-subtle py-6 sm:grid-cols-[2.5rem_1fr] sm:gap-6"
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium">{step.title}</h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-surface/35">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <Reveal className="max-w-sm">
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Controls that stay in place as the organisation grows.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              No raw transcripts. No autonomous publishing. No cross-tenant
              discovery. Governance is part of the operating model from the
              first team to an enterprise rollout.
            </p>
          </Reveal>

          <Reveal>
            <div className="border-t border-border-subtle">
              {guardrails.map((item) => (
                <div
                  key={item.title}
                  className="grid grid-cols-[1.5rem_1fr] gap-4 border-b border-border-subtle py-5"
                >
                  <item.icon
                    className="mt-0.5 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 py-20 sm:py-24 lg:grid-cols-[1fr_auto]">
          <Reveal className="max-w-lg">
            <CheckCircle2
              className="mb-5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-lg leading-7 font-medium tracking-tight text-balance">
              Start with one repository. Scale when the organisation is ready.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Give every authorised engineer consistent, reviewed repository
              context without losing the controls enterprise teams need.
            </p>
          </Reveal>

          <Reveal className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href="/sign-in"
              className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
            >
              Open Intertool
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="btn-pill">
              Read the docs
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
