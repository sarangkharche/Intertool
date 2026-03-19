"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { SkillType } from "@/lib/types";
import { Package, LayoutDashboard, Plus, BookOpen } from "lucide-react";

interface SkillResult {
  slug: string;
  name: string;
  type: SkillType;
  description: string;
}

const CACHE_TTL = 10_000;
const searchCache = new Map<string, { data: SkillResult[]; ts: number }>();

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchSkills = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const cacheKey = q.trim().toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setResults(cached.data);
      return;
    }
    if (cached) {
      setResults(cached.data);
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        const items: SkillResult[] = Array.isArray(data) ? data : data.results ?? data.skills ?? [];
        searchCache.set(cacheKey, { data: items, ts: Date.now() });
        setResults(items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSkills(query), 200);
    return () => clearTimeout(timer);
  }, [query, searchSkills]);

  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search skills or navigate pages">
      <CommandInput
        placeholder="Search skills, navigate..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Skills">
            {results.map((skill) => (
              <CommandItem
                key={skill.slug}
                value={`skill-${skill.slug}`}
                onSelect={() => navigate(`/skills/${skill.slug}`)}
              >
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-1 items-center gap-2">
                  <span>{skill.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {SKILL_TYPE_LABELS[skill.type]}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Pages">
          <CommandItem value="dashboard" onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem value="publish-skill" onSelect={() => navigate("/publish")}>
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Publish a Skill</span>
          </CommandItem>
          <CommandItem value="your-skills" onSelect={() => navigate("/dashboard?mine=true")}>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>Your Skills</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
