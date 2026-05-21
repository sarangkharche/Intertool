import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  Code2,
  Database,
  FileCheck2,
  GitPullRequestDraft,
  Layers3,
  LockKeyhole,
  Scale,
  Server,
  Shield,
  Terminal,
  Workflow,
} from "lucide-react";

export const marketSignals = [
  {
    value: "80%",
    label: "of developers use AI tools in their workflow",
    source: "Stack Overflow 2025 Developer Survey",
    href: "https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/",
  },
  {
    value: "29%",
    label: "trust AI output accuracy",
    source: "Stack Overflow 2025 Developer Survey",
    href: "https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/",
  },
  {
    value: "Public",
    label: "official MCP discovery is built around public servers",
    source: "Model Context Protocol Registry",
    href: "https://modelcontextprotocol.io/registry/about",
  },
];

export const platformProof = [
  "Claude and Codex validate skills as a real workflow primitive, but each manages its own surface.",
  "Copilot and Cursor pull MCP configuration closer to the repository, where review matters.",
  "The public MCP Registry is for public discovery; private servers need a private source of truth.",
  "Engineering teams still need one approval path across every agent their developers use.",
];

export const capabilityPillars: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ClipboardCheck,
    title: "Approve before agents run",
    description:
      "Route skills, prompts, MCP servers, and agent tools through review before they become installable.",
  },
  {
    icon: FileCheck2,
    title: "Version the artifact",
    description:
      "Keep changelogs, snapshots, source metadata, risk status, and package files attached to each capability.",
  },
  {
    icon: Terminal,
    title: "Distribute to every surface",
    description:
      "Give developers approved install paths for Claude Code, Codex, Cursor, Copilot, and MCP clients.",
  },
  {
    icon: Shield,
    title: "Keep private tools private",
    description:
      "Run self-hosted or managed with private storage, OAuth, RBAC, audit history, and org-scoped access.",
  },
];

export const useCases: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Server,
    title: "Private MCP catalog",
    description:
      "Publish internal server configs that should not live in a public marketplace.",
  },
  {
    icon: Code2,
    title: "Cross-agent skills",
    description:
      "Keep reusable Claude, Codex, and project playbooks in one reviewed source of truth.",
  },
  {
    icon: Layers3,
    title: "Prompt playbook library",
    description:
      "Move repeatable prompts out of Slack, local files, and copied snippets into a searchable registry.",
  },
  {
    icon: Workflow,
    title: "Capability governance",
    description:
      "Give DevEx and security teams an audit trail for what agents can discover and run.",
  },
];

export const pricingPlans = [
  {
    name: "Community",
    eyebrow: "Open source",
    price: "$0",
    cadence: "self-hosted",
    description:
      "For teams proving a private approval workflow in their own infrastructure.",
    cta: "Start self-hosted",
    href: "/docs/getting-started",
    featured: false,
    icon: Database,
    features: [
      "Single private registry",
      "S3-compatible storage",
      "CLI publish, install, and update",
      "Skills, MCP servers, prompts, and tools",
      "GitHub OAuth",
      "Review queue and audit log",
    ],
  },
  {
    name: "Team Cloud",
    eyebrow: "Early access",
    price: "$199",
    cadence: "per month base, then $20 per seat",
    description:
      "For engineering teams that want managed cross-agent governance without running infrastructure.",
    cta: "Join early access",
    href: "/sign-in",
    featured: true,
    icon: GitPullRequestDraft,
    features: [
      "Managed hosting",
      "Org paths and member management",
      "Review queue and audit history",
      "Claude, Codex, Cursor, and MCP install paths",
      "Version history",
      "Priority onboarding",
    ],
  },
  {
    name: "Self-hosted Pro",
    eyebrow: "Annual",
    price: "$3k+",
    cadence: "per year",
    description:
      "For DevEx and AI platform teams that need private deployment guidance and support.",
    cta: "Talk through deployment",
    href: "https://github.com/sarangkharche/intertool/issues",
    featured: false,
    icon: LockKeyhole,
    features: [
      "Private deployment support",
      "Governance workflow design",
      "Audit retention guidance",
      "Upgrade assistance",
      "Security review materials",
      "Priority fixes",
    ],
  },
  {
    name: "Enterprise",
    eyebrow: "Custom",
    price: "Custom",
    cadence: "for regulated teams",
    description:
      "For companies standardizing approved agent capabilities across many teams and environments.",
    cta: "Request enterprise plan",
    href: "https://github.com/sarangkharche/intertool/issues",
    featured: false,
    icon: Scale,
    features: [
      "SSO and advanced RBAC roadmap",
      "Policy pack design",
      "Procurement support",
      "Dedicated deployment review",
      "Custom retention requirements",
      "Company rollout planning",
    ],
  },
];
