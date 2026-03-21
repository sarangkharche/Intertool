import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSkills, getCategories, getSkillCounts } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS, PER_PAGE } from "@/lib/constants";
import { Upload, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPreferenceApplier } from "@/components/dashboard-preference-applier";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { ViewToggle } from "@/components/view-toggle";
import { SkillGrid } from "@/components/skill-grid";
import { OnboardingHints } from "@/components/onboarding-hints";
import { getSettings } from "@/lib/settings";
import { isS3Configured } from "@/lib/s3";
import { getUserRole, listMembers } from "@/lib/rbac";
import { getOrgSlug } from "@/lib/org";



const TABS: { label: string; type?: SkillType; mine?: boolean }[] = [
  { label: "All" },
  { label: "Skills", type: "skill" },
  { label: "MCP Servers", type: "mcp-server" },
  { label: "Agents", type: "agent-tool" },
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

  const limit = params.limit ? Number(params.limit) : PER_PAGE;

  const filters: SearchFilters = {
    type: isMine ? undefined : (params.type as SkillType | undefined),
    category: params.category,
    author: isMine ? username || undefined : undefined,
    sort: (params.sort as SearchFilters["sort"]) ?? "newest",
    page: params.page ? Number(params.page) : 1,
    limit,
  };

  // Fetch skills + categories + counts + onboarding state in parallel
  const orgSlug = await getOrgSlug();
  let skills: Awaited<ReturnType<typeof getSkills>>["skills"] = [];
  let total = 0;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let counts: Awaited<ReturnType<typeof getSkillCounts>> = { total: 0, byType: {}, mine: 0 };
  let settings: Awaited<ReturnType<typeof getSettings>> = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  let userRole: Awaited<ReturnType<typeof getUserRole>> = "member";
  try {
    [{ skills, total }, categories, counts, settings, members, userRole] = await Promise.all([
      getSkills(filters),
      getCategories(),
      getSkillCounts(username || undefined),
      getSettings(orgSlug),
      listMembers(orgSlug),
      getUserRole(username || "", orgSlug),
    ]);
  } catch (err) {
    console.error("[dashboard] Failed to load data:", err);
  }

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(total / limit);

  const hasAnySkills = counts.total > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Suspense>
        <DashboardPreferenceApplier />
      </Suspense>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg text-display">Dashboard</h1>
      </div>

      {/* Onboarding hints */}
      <OnboardingHints
        s3Configured={isS3Configured(settings)}
        memberCount={members.length}
        skillCount={counts.total}
        isAdmin={userRole === "admin" || userRole === "owner"}
      />

      {/* Empty state — registry has no skills */}
      {!hasAnySkills && (
        <div className="rounded-lg border border-dashed border-border py-20 text-center">
          <Upload className="mx-auto mb-4 h-6 w-6 text-muted-foreground/40" />
          <p className="mb-1 text-sm font-medium">Your registry is empty</p>
          <p className="mb-5 text-xs text-muted-foreground">
            Publish your first skill, MCP server, agent, or prompt
            template.
          </p>
          <Link
            href="/publish"
            className="btn-pill-lg"
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
          <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-border-subtle">
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
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition-all duration-100 ${
                    active
                      ? "border-foreground/70 font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`font-mono text-xs ${active ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Filter bar + results count + view toggle */}
          <div className="mb-5 flex items-center justify-between">
            <Suspense>
              <DashboardFilters categories={categories} />
            </Suspense>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                {total} result{total !== 1 ? "s" : ""}
              </span>
              <ViewToggle />
            </div>
          </div>

          {/* Skill list */}
          {skills.length > 0 ? (
            <SkillGrid skills={skills} />
          ) : (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No items match your filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          <Suspense>
            <DashboardPagination currentPage={page} totalPages={totalPages} />
          </Suspense>
        </>
      )}
    </div>
  );
}
