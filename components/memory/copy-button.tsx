"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  StableStatusLabel,
  type StableStatus,
} from "@/components/ui/stable-status-label";

const SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.45,
} as const;

function fallbackCopy(value: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState<StableStatus>("idle");
  const timer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    if (timer.current) window.clearTimeout(timer.current);
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      } else {
        copied = fallbackCopy(value);
      }
    } catch {
      copied = fallbackCopy(value);
    }

    setStatus(copied ? "success" : "error");
    timer.current = window.setTimeout(() => setStatus("idle"), 1_800);
  }

  const icons = {
    idle: Copy,
    pending: Copy,
    success: Check,
    error: X,
  } satisfies Record<StableStatus, typeof Copy>;

  return (
    <button
      type="button"
      className="btn-ghost micro-press min-h-9"
      onClick={() => void copy()}
      aria-label={`${label} to clipboard`}
    >
      <span aria-hidden="true" className="grid h-3.5 w-3.5 shrink-0">
        {(Object.keys(icons) as StableStatus[]).map((key) => {
          const Icon = icons[key];
          return (
            <motion.span
              key={key}
              initial={false}
              animate={{
                opacity: key === status ? 1 : 0,
                scale: key === status ? 1 : 0.8,
              }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
              className="col-start-1 row-start-1"
            >
              <Icon className="h-3.5 w-3.5" />
            </motion.span>
          );
        })}
      </span>
      <StableStatusLabel
        status={status}
        idle={label}
        success="Copied"
        error="Copy failed"
      />
    </button>
  );
}
