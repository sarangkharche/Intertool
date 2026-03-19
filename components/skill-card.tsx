import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skill, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { displayAuthor } from "@/lib/utils";

export const SkillCard = memo(function SkillCard({
  skill,
  variant = "grid",
}: {
  skill: Skill;
  variant?: "grid" | "list";
}) {
  if (variant === "list") {
    return (
      <Link href={`/skills/${skill.slug}`}>
        <div className="skill-card group flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/30">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate text-sm font-medium leading-tight text-foreground">
                {skill.name}
              </h3>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
                @{displayAuthor(skill.author)}/{skill.slug}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] leading-normal text-muted-foreground">
              {skill.description}
            </p>
          </div>
          <TypeBadge type={skill.type} />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/skills/${skill.slug}`}>
      <div className="skill-card group rounded-lg border border-border/70 px-4 py-3.5 interactive-card">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium leading-tight group-hover:text-foreground">
              {skill.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              @{displayAuthor(skill.author)}/{skill.slug}
            </p>
          </div>
          <TypeBadge type={skill.type} />
        </div>

        <p className="line-clamp-2 text-sm leading-normal text-muted-foreground">
          {skill.description}
        </p>
      </div>
    </Link>
  );
});

export function TypeBadge({ type }: { type: SkillType }) {
  return (
    <Badge variant="outline" className="shrink-0 text-[10px] font-normal text-muted-foreground">
      {SKILL_TYPE_LABELS[type]}
    </Badge>
  );
}
