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
    label: "MCP registry metadata excludes private servers",
    source: "Model Context Protocol Registry",
    href: "https://modelcontextprotocol.io/registry/about",
  },
];

export const platformProof = [
  "Claude Team and Enterprise orgs can provision skills organization-wide.",
  "Codex supports plugins and skills for team-specific workflows.",
  "Copilot coding agent can use MCP servers configured at the repository layer.",
  "Cursor and other agentic editors are normalizing MCP-based tool access.",
];

export const capabilityPillars: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ClipboardCheck,
    title: "Review before rollout",
    description:
      "Route new skills, prompts, and MCP servers through approval before they become team-installable.",
  },
  {
    icon: FileCheck2,
    title: "Version every capability",
    description:
      "Keep changelogs, snapshots, source metadata, and package files attached to the artifact users install.",
  },
  {
    icon: Terminal,
    title: "Install from one place",
    description:
      "Generate commands for Claude Code, Cursor, the Intertool CLI, and MCP-compatible workflows.",
  },
  {
    icon: Shield,
    title: "Keep internals internal",
    description:
      "Run self-hosted or in a private org path with S3-backed storage, OAuth, RBAC, and audit history.",
  },
];

export const useCases: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Server,
    title: "Private MCP registry",
    description:
      "Catalog internal servers that should never appear in a public marketplace.",
  },
  {
    icon: Code2,
    title: "Claude and Codex skills",
    description:
      "Share tested playbooks for reviews, migrations, docs, frontend work, and support workflows.",
  },
  {
    icon: Layers3,
    title: "Prompt template system",
    description:
      "Move reusable prompts out of Slack, local files, and copied snippets into a searchable registry.",
  },
  {
    icon: Workflow,
    title: "Agent governance",
    description:
      "Give DevEx and security teams a control point for what agents can discover and run.",
  },
];

export const pricingPlans = [
  {
    name: "Community",
    eyebrow: "Open source",
    price: "$0",
    cadence: "self-hosted",
    description:
      "For individuals and small teams standardizing their local agent workflows.",
    cta: "Start self-hosted",
    href: "/docs/getting-started",
    featured: false,
    icon: Database,
    features: [
      "Single registry",
      "S3-compatible storage",
      "CLI install and publish",
      "Skills, MCP servers, prompts, and tools",
      "GitHub OAuth",
      "Community support",
    ],
  },
  {
    name: "Team Cloud",
    eyebrow: "Early access",
    price: "$199",
    cadence: "per month base, then $20 per seat",
    description:
      "For product engineering teams that want hosted registries without running infrastructure.",
    cta: "Join early access",
    href: "/sign-in",
    featured: true,
    icon: GitPullRequestDraft,
    features: [
      "Managed hosting",
      "Org paths and member management",
      "Review queue",
      "Audit log",
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
      "For DevEx and AI platform teams that need private deployment with support.",
    cta: "Talk through deployment",
    href: "https://github.com/sarangkharche/intertool/issues",
    featured: false,
    icon: LockKeyhole,
    features: [
      "Private deployment support",
      "Governance workflow setup",
      "Audit retention guidance",
      "Upgrade assistance",
      "Security review packet",
      "Priority fixes",
    ],
  },
  {
    name: "Enterprise",
    eyebrow: "Custom",
    price: "Custom",
    cadence: "for regulated teams",
    description:
      "For companies standardizing agent capabilities across many teams and environments.",
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
      "Executive rollout planning",
    ],
  },
];
