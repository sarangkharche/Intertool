"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HardDrive, Users, Upload, X } from "lucide-react";

interface Props {
  s3Configured: boolean;
  memberCount: number;
  skillCount: number;
  isAdmin: boolean;
}

interface Hint {
  id: string;
  icon: typeof HardDrive;
  text: string;
  cta: string;
  href: string;
}

const HINTS: Hint[] = [
  {
    id: "configure-storage",
    icon: HardDrive,
    text: "Configure storage to start publishing skills",
    cta: "Configure Storage",
    href: "/settings/admin",
  },
  {
    id: "invite-members",
    icon: Users,
    text: "Invite team members to collaborate on your registry",
    cta: "Invite Members",
    href: "/settings/members",
  },
  {
    id: "publish-first",
    icon: Upload,
    text: "Publish your first skill, agent, or MCP server",
    cta: "Publish",
    href: "/publish",
  },
];

function getActiveHint(props: Props): Hint | null {
  if (!props.s3Configured && props.isAdmin) return HINTS[0];
  if (props.s3Configured && props.memberCount <= 1 && props.isAdmin)
    return HINTS[1];
  if (props.s3Configured && props.skillCount === 0) return HINTS[2];
  return null;
}

function isDismissed(id: string): boolean {
  try {
    return localStorage.getItem(`hint-dismissed:${id}`) === "true";
  } catch {
    return false;
  }
}

export function OnboardingHints(props: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dismissed = new Set<string>();
    for (const hint of HINTS) {
      if (isDismissed(hint.id)) dismissed.add(hint.id);
    }
    setDismissedIds(dismissed);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hint = getActiveHint(props);
  if (!hint || dismissedIds.has(hint.id)) return null;

  const Icon = hint.icon;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-sm text-muted-foreground">{hint.text}</p>
      <Link
        href={hint.href}
        className="shrink-0 text-sm font-medium text-foreground hover:underline"
      >
        {hint.cta}
      </Link>
      <button
        onClick={() => {
          try {
            localStorage.setItem(`hint-dismissed:${hint.id}`, "true");
          } catch {}
          setDismissedIds((prev) => new Set(prev).add(hint.id));
        }}
        className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Dismiss hint"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
