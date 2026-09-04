"use client";

import type * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

interface ShiningTextProps extends React.AriaAttributes {
  text: string;
  className?: string;
  role?: React.AriaRole;
}

function ShiningText({ text, className, ...props }: ShiningTextProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.p
      {...props}
      className={cn(
        "inline-block bg-[linear-gradient(110deg,var(--muted-foreground),35%,var(--foreground),50%,var(--muted-foreground),75%,var(--muted-foreground))] bg-[length:200%_100%] bg-clip-text text-base font-normal text-transparent",
        className
      )}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: shouldReduceMotion ? "50% 0" : "-200% 0" }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              repeat: Infinity,
              duration: 2,
              ease: "linear",
            }
      }
    >
      {text}
    </motion.p>
  );
}

export { ShiningText };
export type { ShiningTextProps };
