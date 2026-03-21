"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { HardDrive, Users, Upload, X, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

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

function getApplicableHints(isAdmin: boolean): Hint[] {
  const applicable: Hint[] = [];
  if (isAdmin) applicable.push(HINTS[0]);
  if (isAdmin) applicable.push(HINTS[1]);
  applicable.push(HINTS[2]);
  return applicable;
}

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
  const toastFired = useRef(false);

  useEffect(() => {
    const dismissed = new Set<string>();
    for (const hint of HINTS) {
      if (isDismissed(hint.id)) dismissed.add(hint.id);
    }
    setDismissedIds(dismissed);
    setMounted(true);
  }, []);

  // Completion toast: all hints naturally resolved (none active, none dismissed)
  useEffect(() => {
    if (!mounted || toastFired.current) return;
    const hint = getActiveHint(props);
    if (hint !== null) return;

    const anyDismissed = HINTS.some((h) => isDismissed(h.id));
    if (anyDismissed) return;

    try {
      if (localStorage.getItem("hint-completed-toast-shown") === "true")
        return;
      localStorage.setItem("hint-completed-toast-shown", "true");
    } catch {
      return;
    }

    toastFired.current = true;
    toast("Setup complete");
  }, [mounted, props]);

  if (!mounted) return null;

  const hint = getActiveHint(props);
  const active =
    hint && !dismissedIds.has(hint.id)
      ? (() => {
          const applicable = getApplicableHints(props.isAdmin);
          const step = applicable.findIndex((h) => h.id === hint.id) + 1;
          return { hint, step, total: applicable.length };
        })()
      : null;

  const Icon = active ? active.hint.icon : null;

  return (
    <AnimatePresence mode="wait">
      {active && Icon && (
        <motion.div
          key={active.hint.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mb-6 overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
            <span className="font-mono text-[11px] text-muted-foreground/50">
              {active.step}/{active.total}
            </span>
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="flex-1 text-sm text-muted-foreground">
              {active.hint.text}
            </p>
            <Link
              href={active.hint.href}
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
            >
              {active.hint.cta}
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => {
                try {
                  localStorage.setItem(
                    `hint-dismissed:${active.hint.id}`,
                    "true"
                  );
                } catch {}
                setDismissedIds((prev) => new Set(prev).add(active.hint.id));
              }}
              className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-muted-foreground"
              aria-label="Dismiss hint"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
