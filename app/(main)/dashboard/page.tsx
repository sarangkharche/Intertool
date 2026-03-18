import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SkillCard } from "@/components/skill-card";
import { getSkills, getCategories, getSkillCounts } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS, PER_PAGE } from "@/lib/constants";
import { Upload, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DashboardFilters } from "@/components/dashboard-filters";

export const dynamic = "force-dynamic";

const TABS: { label: string; type?: SkillType; mine?: boolean }[] = [
  { label: "All" },
  { label: "Skills", type: "skill" },
  { label: "MCP Servers", type: "mcp-server" },
  { label: "Tools", type: "agent-tool" },
  { label: "Prompts", type: "prompt-template" },
  { label: "Yours", mine: true },
];

function buildTabHref(
  tab: (typeof TABS)[number],
  currentParams: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  if (tab.mine) {
    params.set("mine", "true");
  } else if (tab.type) {
    params.set("type", tab.type);
  }
  // Preserve category and sort across tabs
  if (currentParams.category) params.set("category", currentParams.category);
  if (currentParams.sort && currentParams.sort !== "newest")
    params.set("sort", currentParams.sort);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function isActiveTab(
  tab: (typeof TABS)[number],
  params: Record<string, string | undefined>
): boolean {
  if (tab.mine) return params.mine === "true";
  if (tab.type) return params.type === tab.type && params.mine !== "true";
  return !params.type && params.mine !== "true";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const username = (session?.user as { username?: string } | undefined)
    ?.username;

  const params = await searchParams;
  const isMine = params.mine === "true";

  const filters: SearchFilters = {
    type: isMine ? undefined : (params.type as SkillType | undefined),
    category: params.category,
    author: isMine ? username || undefined : undefined,
    sort: (params.sort as SearchFilters["sort"]) ?? "newest",
    page: params.page ? Number(params.page) : 1,
  };

  // Fetch skills + categories + counts for tabs in parallel
  const [{ skills, total }, categories, counts] = await Promise.all([
    getSkills(filters),
    getCategories(),
    getSkillCounts(username || undefined),
  ]);

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(total / PER_PAGE);

  const hasAnySkills = counts.total > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-xl font-medium tracking-tight">Dashboard</h1>
        <Link
          href="/publish"
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Publish
        </Link>
      </div>

      {/* Empty state — registry has no skills */}
      {!hasAnySkills && (
        <div className="rounded-lg border border-dashed border-border py-20 text-center">
          <Upload className="mx-auto mb-4 h-6 w-6 text-muted-foreground/40" />
          <p className="mb-1 text-sm font-medium">Your registry is empty</p>
          <p className="mb-5 text-xs text-muted-foreground">
            Publish your first skill, MCP server, agent tool, or prompt
            template.
          </p>
          <Link
            href="/publish"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Publish to registry
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Populated state */}
      {hasAnySkills && (
        <>
          {/* Tab bar */}
          <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-border">
            {TABS.map((tab) => {
              const active = isActiveTab(tab, params);
              const count = tab.mine
                ? counts.mine
                : tab.type
                  ? counts.byType[tab.type] ?? 0
                  : counts.total;
              return (
                <Link
                  key={tab.label}
                  href={buildTabHref(tab, params)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-foreground font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`font-mono text-xs ${active ? "text-foreground" : "text-muted-foreground/60"}`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Filter bar */}
          <div className="mb-6">
            <Suspense>
              <DashboardFilters categories={categories} />
            </Suspense>
          </div>

          {/* Results count */}
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              {total} result{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Skill list */}
          {skills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {skills.map((skill) => (
                <SkillCard key={skill.slug} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No items match your filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Link>
              )}
              <span className="font-mono text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
