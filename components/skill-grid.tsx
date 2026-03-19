"use client";

import { SkillCard } from "@/components/skill-card";
import { usePreferences } from "@/lib/use-preferences";
import type { Skill } from "@/lib/types";

export function SkillGrid({ skills }: { skills: Skill[] }) {
  const [prefs] = usePreferences();
  const view = prefs.defaultView;

  if (view === "list") {
    return (
      <div className="rounded-lg border border-border/70 divide-y divide-border/70">
        {skills.map((skill) => (
          <SkillCard key={skill.slug} skill={skill} variant="list" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {skills.map((skill) => (
        <SkillCard key={skill.slug} skill={skill} variant="grid" />
      ))}
    </div>
  );
}
