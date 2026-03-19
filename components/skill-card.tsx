import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skill, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS, SKILL_TYPE_COLORS } from "@/lib/constants";
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
        <div className="skill-card group flex items-center gap-4 rounded-lg border border-border/70 px-4 py-3 interactive-card">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium leading-tight group-hover:text-foreground">
                {skill.name}
              </h3>
              <p className="shrink-0 font-mono text-xs text-muted-foreground">
                @{displayAuthor(skill.author)}/{skill.slug}
              </p>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
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
    <Badge variant="outline" className={`shrink-0 text-[10px] font-normal ${SKILL_TYPE_COLORS[type]}`}>
      {SKILL_TYPE_LABELS[type]}
    </Badge>
  );
}
