"use client";

import { useState } from "react";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import {
  ArrowUpRight,
  Bot,
  Braces,
  GitBranch,
  Package,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { LandingInstallPicker } from "@/components/landing-install-picker";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const demoPrompts = [
  {
    prompt: "What should I know before changing refund tests?",
    answer: [
      "3 published memories found",
      "Repository  acme/payments-service",
      "Path        tests/refunds/**",
      "Source      PR #1842",
      "Refund tests must emit LEDGER_EVENTS before asserting settlement state.",
    ],
  },
  {
    prompt: "Why does login depend on the profile service?",
    answer: [
      "2 published memories found",
      "Repository  acme/identity",
      "Path        src/login/**",
      "Source      ADR-014",
      "Profile hydration moved behind authentication; entitlement lookup remains a boundary.",
    ],
  },
  {
    prompt: "Which team owns payments reconciliation?",
    answer: [
      "1 published memory found",
      "Repository  acme/payments-service",
      "Path        jobs/reconciliation/**",
      "Owner       Payments Platform",
      "Escalate failed settlement batches through the payments operations runbook.",
    ],
  },
  {
    prompt: "What changed after the last release?",
    answer: [
      "4 published memories found",
      "Repository  acme/web",
      "Path        app/**",
      "Source      Release 2026.09",
      "The auth callback, billing retry, and repository sync paths changed in this release.",
    ],
  },
] as const;

const capabilities = [
  {
    label: "Get scoped context",
    request: "What should I know before editing refund tests?",
    skill: "Selecting reviewed repository context",
    detail:
      "Matching organisation, repository, path, status, and task relevance",
    result: "Returning 3 published memories with sources",
  },
  {
    label: "Find ownership",
    request: "Who owns payments reconciliation?",
    skill: "Tracing ownership and responsibility",
    detail:
      "Reading confirmed owners, repositories, runbooks, and escalation paths",
    result: "Returning the owning team and source record",
  },
  {
    label: "Summarize decisions",
    request: "Why was the ledger event made mandatory?",
    skill: "Collecting versioned engineering decisions",
    detail: "Reading published memory versions and their linked evidence",
    result: "Returning the decision, rationale, and source",
  },
  {
    label: "Review engineering work",
    request: "What could this refund-test change break?",
    skill: "Retrieving path-specific warnings",
    detail: "Filtering confirmed constraints for the files in this task",
    result: "Returning relevant risks without unrelated memory",
  },
  {
    label: "Prepare operations",
    request: "How do we respond to a failed settlement batch?",
    skill: "Finding the current operational runbook",
    detail: "Checking publication state, owner, version, and expiry",
    result: "Returning the approved response path",
  },
  {
    label: "Move work forward",
    request: "What is the next safe change?",
    skill: "Combining reviewed context for the active task",
    detail: "Ranking compact, source-backed memories for this repository",
    result: "Returning the next action with evidence",
  },
] as const;

function TerminalDemo() {
  const [activePrompt, setActivePrompt] = useState(0);
  const selected = demoPrompts[activePrompt];

  return (
    <div className="landing-demo-frame" data-interactive-demo>
      <div className="landing-terminal-window" aria-live="polite">
        <div className="landing-window-bar">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <span className="landing-window-dot bg-destructive" />
            <span className="landing-window-dot bg-warning" />
            <span className="landing-window-dot bg-success" />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            intertool · agent preview
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            Illustrative data
          </span>
        </div>
        <div className="landing-terminal-output">
          <p className="text-sm text-foreground">$ {selected.prompt}</p>
          <div className="mt-6 space-y-2 font-mono text-xs leading-5 text-muted-foreground">
            {selected.answer.map((line, index) => (
              <p
                key={line}
                className={
                  index === 0 || index === selected.answer.length - 1
                    ? "text-foreground"
                    : undefined
                }
              >
                <span className="mr-3 text-primary">{index + 1}.</span>
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="landing-terminal-status">
          <span>Intertool MCP · illustrative session</span>
          <span>ready</span>
        </div>
      </div>

      <div className="landing-prompt-grid" aria-label="Example prompts">
        {demoPrompts.map((item, index) => (
          <button
            key={item.prompt}
            type="button"
            onClick={() => setActivePrompt(index)}
            className="landing-prompt-button"
            aria-pressed={activePrompt === index}
          >
            <SearchCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{item.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CapabilityExplorer() {
  const [activeCapability, setActiveCapability] = useState(0);
  const selected = capabilities[activeCapability];

  return (
    <div className="landing-capability-layout">
      <div className="landing-capability-copy">
        <div className="mb-6 flex items-center gap-3 text-muted-foreground">
          <Bot className="h-4 w-4" aria-hidden="true" />
          <Braces className="h-4 w-4" aria-hidden="true" />
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <h2
          className={`${newsreader.className} max-w-sm text-3xl leading-tight font-normal tracking-[-0.018em] text-foreground sm:text-4xl`}
        >
          Give your agents reviewed engineering context.
        </h2>
        <p className="mt-6 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          Intertool helps supported agents find confirmed decisions, warnings,
          runbooks, and ownership without widening access or sending unrelated
          memory.
        </p>
        <div
          className="mt-8 flex flex-col"
          role="tablist"
          aria-label="Intertool capabilities"
        >
          {capabilities.map((capability, index) => (
            <button
              key={capability.label}
              type="button"
              role="tab"
              aria-selected={activeCapability === index}
              onClick={() => setActiveCapability(index)}
              className="landing-capability-tab"
            >
              {capability.label}
            </button>
          ))}
        </div>
      </div>

      <div className="landing-capability-stage" role="tabpanel">
        <div className="landing-capability-window">
          <div className="flex gap-2" aria-hidden="true">
            <span className="landing-window-dot bg-destructive" />
            <span className="landing-window-dot bg-warning" />
            <span className="landing-window-dot bg-success" />
          </div>
          <p className="ml-auto mt-6 max-w-md rounded-full bg-foreground px-5 py-3 text-sm text-background">
            {selected.request}
          </p>

          <ol className="landing-capability-sequence">
            <li>
              <span>Agent</span>
              <p>Received request</p>
            </li>
            <li className="landing-capability-active-step">
              <span>Intertool</span>
              <p>{selected.skill}</p>
              <code>get_context</code>
            </li>
            <li>
              <span>Memory layer</span>
              <p>{selected.detail}</p>
            </li>
            <li>
              <span>Answer</span>
              <p>{selected.result}</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page-shell bg-background text-foreground">
      <section id="product" className="landing-cli-hero">
        <div className="landing-cli-hero-message">
          <h1 className={newsreader.className}>
            Reviewed engineering memory, now in every coding agent.
          </h1>
          <p>
            Install Intertool and bring source-backed repository context to
            Claude Code, Codex, Copilot, and other MCP clients.
          </p>
        </div>
        <div className="landing-cli-installer">
          <LandingInstallPicker />
        </div>
      </section>

      <section id="explore" className="landing-cli-section">
        <div className="landing-cli-section-heading">
          <h2 className={newsreader.className}>Explore Intertool</h2>
          <p>
            Try sample prompts to see how reviewed engineering memory reaches a
            coding agent.
          </p>
        </div>
        <TerminalDemo />
      </section>

      <section id="capabilities" className="landing-cli-section">
        <CapabilityExplorer />
      </section>

      <section
        className="landing-proof-section"
        aria-label="Product guarantees"
      >
        <div>
          <strong className={newsreader.className}>Human approved</strong>
          <span>before publication</span>
        </div>
        <div>
          <strong className={newsreader.className}>Scope checked</strong>
          <span>before retrieval</span>
        </div>
        <p>Intertool control-plane guarantees</p>
      </section>

      <section
        id="get-started"
        className="landing-cli-section landing-get-started"
      >
        <h2 className={newsreader.className}>Get started</h2>
        <div className="landing-start-grid">
          <Link href="/docs/getting-started" className="landing-start-card">
            <span>01</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <strong>Create an API token</strong>
            <p>Generate a personal token that can be revoked independently.</p>
          </Link>
          <Link
            href="/docs/getting-started#connect-ai-clients"
            className="landing-start-card"
          >
            <span>02</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <strong>Connect your agent</strong>
            <p>
              Add Intertool to Claude Code, Codex, Copilot, or another client.
            </p>
          </Link>
          <Link
            href="/docs/getting-started#verify-the-connection"
            className="landing-start-card"
          >
            <span>03</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <strong>Verify the context</strong>
            <p>Confirm the MCP tools and retrieve one reviewed memory.</p>
          </Link>
        </div>

        <div className="landing-learn-more">
          <div>
            <Link href="/docs">
              <span>Read the documentation</span>
              <small>Install, publish, retrieve, and govern memory</small>
            </Link>
            <Link href="/docs/api/overview">
              <span>Explore the API</span>
              <small>Use the REST and Streamable HTTP MCP interfaces</small>
            </Link>
            <Link href="/docs/architecture">
              <span>Understand the architecture</span>
              <small>
                See how evidence, scope, versions, and audits connect
              </small>
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-cli-footer">
        <div className="landing-footer-brand">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" aria-hidden="true" />
            intertool
          </div>
          <p>Reviewed context for engineering agents.</p>
        </div>
        <div>
          <strong>Product</strong>
          <Link href="#explore">Explore</Link>
          <Link href="#capabilities">MCP context</Link>
          <Link href="#get-started">Get started</Link>
        </div>
        <div>
          <strong>Developers</strong>
          <Link href="/docs">Documentation</Link>
          <Link href="/docs/api/overview">API</Link>
          <Link href="/docs/api/authentication">Authentication</Link>
        </div>
        <div>
          <strong>Connect</strong>
          <Link href="/docs/getting-started#claude-code">Claude Code</Link>
          <Link href="/docs/getting-started#chatgpt-desktop-and-codex">
            Codex
          </Link>
          <Link href="/docs/getting-started#github-copilot">
            GitHub Copilot
          </Link>
        </div>
      </footer>
    </div>
  );
}
