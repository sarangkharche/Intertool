import type { Metadata } from "next";
import Link from "next/link";
import { pricingPlans } from "@/lib/marketing";
import { getPublicPageMetadata } from "@/lib/seo";
import { ArrowRight, Check, HelpCircle } from "lucide-react";

export const metadata: Metadata = getPublicPageMetadata({
  title: "Pricing",
  description:
    "Intertool pricing for open-source self-hosting, hosted team registries, self-hosted Pro support, and enterprise AI agent governance.",
  path: "/pricing",
});

const faqs = [
  {
    question: "Can we start self-hosted and move to paid later?",
    answer:
      "Yes. Community is the recommended starting point for teams proving the workflow. Paid plans add hosting, governance support, deployment help, and enterprise rollout assistance.",
  },
  {
    question: "Does Intertool replace public MCP registries?",
    answer:
      "No. Public registries are useful for public discovery. Intertool is for private team-owned skills, prompts, MCP servers, and agent tools that need review, versioning, and access control.",
  },
  {
    question: "Is Team Cloud available today?",
    answer:
      "Team Cloud is early access pricing. The self-hosted app is the stable path today; managed hosting is intended for teams that want Intertool without operating storage and deployment.",
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
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-5xl">
                Start with a private registry. Scale into governance.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Intertool is open source for teams that want to self-host. Paid
                plans are for hosted workflows, private deployment support, and
                company-wide AI agent capability governance.
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/25 p-4">
              <p className="text-sm font-medium">Recommended path</p>
              <ol className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                <li>1. Prove the workflow on Community.</li>
                <li>2. Add review and audit discipline with Team Cloud.</li>
                <li>3. Move to Pro or Enterprise when procurement matters.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 lg:grid-cols-4">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`flex min-h-[34rem] flex-col rounded-lg border p-5 ${
                plan.featured
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 bg-surface"
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
                className={`mt-5 min-h-24 text-sm leading-6 ${
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
                className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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
            <h2 className="text-2xl font-semibold leading-tight">
              Built for teams still deciding how agent governance should work.
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border border-border/70 bg-background p-4"
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
