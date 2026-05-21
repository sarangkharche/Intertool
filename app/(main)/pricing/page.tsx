import type { Metadata } from "next";
import Link from "next/link";
import { pricingPlans } from "@/lib/marketing";
import { getPublicPageMetadata } from "@/lib/seo";
import { ArrowRight, Check, HelpCircle } from "lucide-react";

export const metadata: Metadata = getPublicPageMetadata({
  title: "Pricing",
  description:
    "Intertool pricing for private agent capability approval, hosted team registries, self-hosted support, and enterprise AI governance.",
  path: "/pricing",
});

const valueProps = [
  {
    title: "Not another native skill store",
    body: "Claude, Codex, Cursor, and Copilot each expose their own surfaces. Intertool gives your team one approval record across them.",
  },
  {
    title: "Govern what gets installed",
    body: "Review skills, prompts, MCP servers, and internal tools before they become searchable or installable by the team.",
  },
  {
    title: "Keep private capability history",
    body: "Track ownership, versions, source metadata, package files, audit events, and risk signals outside public marketplaces.",
  },
];

const faqs = [
  {
    question: "Can we start self-hosted and move to paid later?",
    answer:
      "Yes. Community is the recommended starting point for proving the approval workflow. Paid plans add managed hosting, governance support, deployment help, and enterprise rollout assistance.",
  },
  {
    question: "Why not just use Claude or Codex skills?",
    answer:
      "Use their native skill systems for execution. Use Intertool when you need one reviewed, versioned, auditable source of truth across Claude, Codex, Cursor, Copilot, MCP clients, and custom agents.",
  },
  {
    question: "Does Intertool replace public MCP registries?",
    answer:
      "No. Public registries are useful for public discovery. Intertool is for private team-owned MCP servers, skills, prompts, and agent tools that need review, versioning, and access control.",
  },
  {
    question: "Is Team Cloud available today?",
    answer:
      "Team Cloud is early access pricing. The self-hosted app is the stable path today; managed hosting is for teams that want the approval workflow without operating storage and deployment.",
  },
  {
    question: "What counts as an Intertool seat?",
    answer:
      "A seat is a person who signs in to browse, publish, review, or administer the registry. CLI-only automation can use API tokens without being modeled as a separate person.",
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="border-b border-border-subtle">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <p className="mb-4 text-xs font-medium uppercase text-muted-foreground">
            Pricing
          </p>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <h1 className="text-display max-w-3xl text-3xl leading-[1.05] sm:text-5xl">
                Start with private approval. Scale into agent governance.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Intertool is open source for teams that want to self-host. Paid
                plans are for hosted approval workflows, private deployment
                support, and company-wide AI agent capability governance.
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
              <p className="text-sm font-medium">Recommended path</p>
              <ol className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                <li>1. Prove the workflow on Community.</li>
                <li>2. Add hosted review and audit with Team Cloud.</li>
                <li>3. Move to Pro or Enterprise when procurement matters.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-5 border-y border-border-subtle py-8 md:grid-cols-3">
          {valueProps.map((item) => (
            <div key={item.title}>
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 pt-2">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-start">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col rounded-lg border p-4 sm:p-5 ${
                plan.featured
                  ? "border-foreground bg-foreground text-background lg:-mt-4 lg:min-h-[35rem]"
                  : "border-border/70 bg-surface lg:min-h-[32rem]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-[11px] font-medium uppercase ${
                      plan.featured
                        ? "text-background/55"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan.eyebrow}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{plan.name}</h2>
                </div>
                <plan.icon
                  className={`h-5 w-5 ${
                    plan.featured
                      ? "text-background/55"
                      : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-6">
                <span className="text-3xl font-semibold">{plan.price}</span>
                <p
                  className={`mt-1 min-h-8 text-xs ${
                    plan.featured
                      ? "text-background/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {plan.cadence}
                </p>
              </div>

              <p
                className={`mt-5 text-sm leading-6 md:min-h-24 ${
                  plan.featured ? "text-background/75" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs leading-5">
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

              <Link
                href={plan.href}
                className={`mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-ring ${
                  plan.featured
                    ? "border-background/25 bg-background text-foreground hover:bg-background/90"
                    : "border-border hover:bg-muted"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border-subtle bg-muted/20">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
              Questions
            </p>
            <h2 className="text-display text-2xl leading-tight">
              Built for teams still deciding how agent governance should work.
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border-t border-border-subtle py-5"
              >
                <div className="flex gap-3">
                  <HelpCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-sm font-semibold">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
