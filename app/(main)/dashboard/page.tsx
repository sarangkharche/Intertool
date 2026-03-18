import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SkillCard } from "@/components/skill-card";
import { getSkills, getCategories, getRecentSkills } from "@/lib/registry";
import {
  Package,
  ArrowRight,
  Upload,
  Search,
  Layers,
  Zap,
  Terminal,
  FileText,
  Wrench,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  skill: <Zap className="h-3.5 w-3.5" />,
  "mcp-server": <Terminal className="h-3.5 w-3.5" />,
  "agent-tool": <Wrench className="h-3.5 w-3.5" />,
  "prompt-template": <FileText className="h-3.5 w-3.5" />,
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const username = (session?.user as { username?: string } | undefined)
    ?.username;

  const [{ skills: allSkills }, categories, recentSkills] = await Promise.all([
    getSkills({ limit: 1000 }),
    getCategories(),
    getRecentSkills(),
  ]);

  const mySkills = username
    ? allSkills.filter(
        (s) => s.author.toLowerCase() === username.toLowerCase()
      )
    : [];

  const typeBreakdown = allSkills.reduce(
    (acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasSkills = allSkills.length > 0;
  const displaySkills = session?.user ? mySkills : allSkills;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span><span className="text-foreground">{typeBreakdown["skill"] ?? 0}</span> skills</span>
          <span><span className="text-foreground">{typeBreakdown["mcp-server"] ?? 0}</span> MCP</span>
          <span><span className="text-foreground">{typeBreakdown["agent-tool"] ?? 0}</span> tools</span>
          <span><span className="text-foreground">{typeBreakdown["prompt-template"] ?? 0}</span> prompts</span>
        </div>
      </div>

      {/* Empty state — registry has no skills yet */}
      {!hasSkills && (
        <div className="rounded-lg border border-dashed border-border py-20 text-center">
          <Upload className="mx-auto mb-4 h-6 w-6 text-muted-foreground/40" />
          <p className="mb-1 text-sm font-medium">
            Your registry is empty
          </p>
          <p className="mb-5 text-xs text-muted-foreground">
            Publish your first skill, MCP server, agent tool, or prompt
            template.
          </p>
          <Link
            href="/publish"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Publish your first skill
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Populated state — skills exist */}
      {hasSkills && (
        <>
          {/* Two-column layout */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main — your skills */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Your skills
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {displaySkills.length}
                </span>
              </div>

              {displaySkills.length > 0 ? (
                <div className="grid gap-3">
                  {displaySkills.map((skill) => (
                    <SkillCard key={skill.slug} skill={skill} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border py-12 text-center">
                  <Package className="mx-auto mb-3 h-5 w-5 text-muted-foreground/40" />
                  <p className="mb-1 text-sm text-muted-foreground">
                    You haven&apos;t published anything yet
                  </p>
                  <Link
                    href="/publish"
                    className="text-xs text-primary hover:underline"
                  >
                    Publish a skill
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick actions */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Actions
                </p>
                <div className="space-y-px overflow-hidden rounded-lg border border-border">
                  <Link
                    href="/browse"
                    className="flex items-center gap-3 bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1">Browse registry</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              {/* Type breakdown */}
              {Object.keys(typeBreakdown).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    By type
                  </p>
                  <div className="space-y-1">
                    {Object.entries(typeBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
                        >
                          {TYPE_ICONS[type] ?? (
                            <Layers className="h-3.5 w-3.5" />
                          )}
                          <span className="flex-1 capitalize">
                            {type.replace(/-/g, " ")}
                          </span>
                          <span className="font-mono text-xs">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {recentSkills.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Recently added
                  </p>
                  <div className="space-y-2">
                    {recentSkills.slice(0, 4).map((skill) => (
                      <Link
                        key={skill.slug}
                        href={`/skills/${skill.slug}`}
                        className="group/item block rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">
                            {TYPE_ICONS[skill.type] ?? (
                              <Package className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="text-sm font-medium group-hover/item:text-primary">
                            {skill.name}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate pl-6 font-mono text-xs text-muted-foreground">
                          @{skill.author}/{skill.slug}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
