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
    label: "developer AI adoption",
    source: "Stack Overflow 2025",
    href: "https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/",
  },
  {
    value: "29%",
    label: "trust AI accuracy",
    source: "Stack Overflow 2025",
    href: "https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/",
  },
  {
    value: "Public",
    label: "public MCP discovery",
    source: "MCP Registry",
    href: "https://modelcontextprotocol.io/registry/about",
  },
];

export const platformProof = [
  "One approval path",
  "Private by default",
  "Owners and versions",
  "Approved installs",
];

export const capabilityPillars: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ClipboardCheck,
    title: "Approve",
    description: "Review first.",
  },
  {
    icon: FileCheck2,
    title: "Version",
    description: "Track changes.",
  },
  {
    icon: Terminal,
    title: "Distribute",
    description: "Publish paths.",
  },
  {
    icon: Shield,
    title: "Keep private",
    description: "Control access.",
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
    description: "Internal servers.",
  },
  {
    icon: Code2,
    title: "Cross-agent skills",
    description: "Shared playbooks.",
  },
  {
    icon: Layers3,
    title: "Prompt playbooks",
    description: "Reviewed prompts.",
  },
  {
    icon: Workflow,
    title: "Governance",
    description: "Live audit trail.",
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
