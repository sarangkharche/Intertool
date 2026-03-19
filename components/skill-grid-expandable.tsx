"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOnClickOutside } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { Skill } from "@/lib/types";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { displayAuthor } from "@/lib/utils";

export function SkillGridExpandable({ skills }: { skills: Skill[] }) {
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const router = useRouter();
  useOnClickOutside(ref, () => setActiveSkill(null));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveSkill(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <AnimatePresence>
        {activeSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSkill && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              ref={ref}
              layoutId={`skill-card-${activeSkill.slug}`}
              className="flex w-full max-w-lg cursor-default flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-5 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <motion.h3
                    layoutId={`skill-name-${activeSkill.slug}`}
                    className="text-sm font-medium text-foreground"
                  >
                    {activeSkill.name}
                  </motion.h3>
                  <motion.p
                    layoutId={`skill-author-${activeSkill.slug}`}
                    className="mt-0.5 font-mono text-xs text-muted-foreground"
                  >
                    @{displayAuthor(activeSkill.author)}/{activeSkill.slug}
                  </motion.p>
                </div>
                <motion.div layoutId={`skill-badge-${activeSkill.slug}`}>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] font-normal text-muted-foreground"
                  >
                    {SKILL_TYPE_LABELS[activeSkill.type]}
                  </Badge>
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.05 } }}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {activeSkill.description}
              </motion.p>

              {activeSkill.tags?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                  className="flex flex-wrap gap-1.5"
                >
                  {activeSkill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.05 } }}
                onClick={() => router.push(`/skills/${activeSkill.slug}`)}
                className="btn-pill self-start mt-1"
              >
                View details
                <ArrowRight className="h-3 w-3" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => (
          <motion.div
            key={skill.slug}
            layoutId={`skill-card-${skill.slug}`}
            onClick={() => setActiveSkill(skill)}
            className="skill-card group cursor-pointer rounded-lg border border-border/70 px-4 py-3.5 interactive-card"
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <motion.h3
                  layoutId={`skill-name-${skill.slug}`}
                  className="truncate text-sm font-medium leading-tight group-hover:text-foreground"
                >
                  {skill.name}
                </motion.h3>
                <motion.p
                  layoutId={`skill-author-${skill.slug}`}
                  className="mt-0.5 font-mono text-xs text-muted-foreground"
                >
                  @{displayAuthor(skill.author)}/{skill.slug}
                </motion.p>
              </div>
              <motion.div layoutId={`skill-badge-${skill.slug}`}>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] font-normal text-muted-foreground"
                >
                  {SKILL_TYPE_LABELS[skill.type]}
                </Badge>
              </motion.div>
            </div>
            <p className="line-clamp-2 text-sm leading-normal text-muted-foreground">
              {skill.description}
            </p>
          </motion.div>
        ))}
      </div>
    </>
  );
}
