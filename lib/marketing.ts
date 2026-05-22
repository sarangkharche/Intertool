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
  "Review before install",
  "Private by default",
  "Owners and versions",
  "Audit trail",
];

export const capabilityPillars: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ClipboardCheck,
    title: "Approve",
    description: "Block risky tools.",
  },
  {
    icon: FileCheck2,
    title: "Version",
    description: "Track every change.",
  },
  {
    icon: Terminal,
    title: "Distribute",
    description: "Publish paths.",
  },
  {
    icon: Shield,
    title: "Keep private",
    description: "Limit access.",
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
    description: "Reusable tasks.",
  },
  {
    icon: Layers3,
    title: "Prompt playbooks",
    description: "Approved templates.",
  },
  {
    icon: Workflow,
    title: "Governance",
    description: "Audit trail.",
  },
];

export const pricingPlans = [
  {
    name: "Community",
    eyebrow: "Open source",
    price: "$0",
    cadence: "self-hosted",
    description: "Self-host the approval workflow.",
    cta: "Start self-hosted",
    href: "/docs/getting-started",
    featured: false,
    icon: Database,
    features: [
      "Private registry",
      "S3-compatible storage",
      "CLI publish and install",
      "Review queue and audit log",
    ],
  },
  {
    name: "Team Cloud",
    eyebrow: "Early access",
    price: "$199",
    cadence: "per month base, then $20 per seat",
    description: "Managed review without infrastructure.",
    cta: "Join early access",
    href: "/sign-in",
    featured: true,
    icon: GitPullRequestDraft,
    features: [
      "Managed hosting",
      "Members and org paths",
      "Review and audit history",
      "Cross-agent install paths",
      "Priority onboarding",
    ],
  },
  {
    name: "Self-hosted Pro",
    eyebrow: "Annual",
    price: "$3k+",
    cadence: "per year",
    description: "Deployment help for platform teams.",
    cta: "Talk through deployment",
    href: "https://github.com/sarangkharche/intertool/issues",
    featured: false,
    icon: LockKeyhole,
    features: [
      "Deployment support",
      "Workflow design",
      "Audit retention guidance",
      "Priority fixes",
    ],
  },
  {
    name: "Enterprise",
    eyebrow: "Custom",
    price: "Custom",
    cadence: "for regulated teams",
    description: "Rollout support for regulated orgs.",
    cta: "Request enterprise plan",
    href: "https://github.com/sarangkharche/intertool/issues",
    featured: false,
    icon: Scale,
    features: [
      "SSO and RBAC roadmap",
      "Policy pack design",
      "Procurement support",
      "Custom retention",
    ],
  },
];
