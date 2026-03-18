import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skill, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS, SKILL_TYPE_COLORS } from "@/lib/constants";
import { displayAuthor } from "@/lib/utils";

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link href={`/skills/${skill.slug}`}>
      <div className="group rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium leading-tight group-hover:text-primary">
              {skill.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              @{displayAuthor(skill.author)}/{skill.slug}
            </p>
          </div>
          <TypeBadge type={skill.type} />
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {skill.description}
        </p>
      </div>
    </Link>
  );
}

export function TypeBadge({ type }: { type: SkillType }) {
  return (
    <Badge variant="outline" className={`shrink-0 text-[10px] font-normal ${SKILL_TYPE_COLORS[type]}`}>
      {SKILL_TYPE_LABELS[type]}
    </Badge>
  );
}
