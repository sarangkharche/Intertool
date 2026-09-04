"use client";

import { motion, useReducedMotion } from "motion/react";

export type StableStatus = "idle" | "pending" | "success" | "error";

interface StableStatusLabelProps {
  status: StableStatus;
  idle: string;
  pending?: string;
  success?: string;
  error?: string;
  className?: string;
}

const TEXT_SWAP = {
  duration: 0.15,
  ease: "easeInOut",
} as const;

export function StableStatusLabel({
  status,
  idle,
  pending = idle,
  success = idle,
  error = idle,
  className = "",
}: StableStatusLabelProps) {
  const reduceMotion = useReducedMotion();
  const labels: Record<StableStatus, string> = {
    idle,
    pending,
    success,
    error,
  };

  return (
    <>
      <span
        aria-hidden="true"
        className={`relative inline-grid place-items-center ${className}`}
      >
        {(Object.keys(labels) as StableStatus[]).map((key) => (
          <motion.span
            key={key}
            initial={false}
            animate={
              key === status
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 4, filter: "blur(2px)" }
            }
            transition={reduceMotion ? { duration: 0 } : TEXT_SWAP}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {labels[key]}
          </motion.span>
        ))}
      </span>
      <span className="sr-only" aria-live="polite">
        {labels[status]}
      </span>
    </>
  );
}
