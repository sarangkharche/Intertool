import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSkills, getCategories, getSkillCounts } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { ArrowRight, Github, PenLine, Upload } from "lucide-react";
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
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Dashboard");

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

function EmptyDashboard({
  storageConfigured,
  memberCount,
  isAdmin,
}: {
  storageConfigured: boolean;
  memberCount: number;
  isAdmin: boolean;
}) {
  const statusItems = [
    {
      label: "Storage",
      value: storageConfigured ? "File uploads ready" : "Metadata only",
      href: isAdmin ? "/settings/admin" : undefined,
      action: storageConfigured ? "Settings" : "Configure",
    },
    {
      label: "Team",
      value: `${memberCount} member${memberCount === 1 ? "" : "s"}`,
      href: isAdmin ? "/settings/members" : undefined,
      action: "Invite",
    },
    {
      label: "Items",
      value: "0 published",
      href: "/publish",
      action: "Publish",
    },
  ];
  const quickActions = [
    {
      label: "Import GitHub",
      href: "/publish?mode=quick",
      icon: Github,
    },
    {
      label: "Manual item",
      href: "/publish?mode=manual",
      icon: PenLine,
    },
  ];

  return (
    <section>
      <div className="mb-4 grid rounded-lg border border-border/70 bg-surface sm:grid-cols-3 sm:divide-x sm:divide-border/70">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 last:border-b-0 sm:border-b-0"
          >
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium">{item.value}</p>
            </div>
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex min-h-11 min-w-11 items-center justify-end rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-ring"
              >
                {item.action}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-surface">
        <div className="flex flex-col justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-medium">Registry items</h2>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              0 results
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="btn-ghost min-h-11"
              >
                <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden grid-cols-[1fr_120px_140px_100px] border-b border-border-subtle px-4 py-2 font-mono text-[11px] uppercase text-muted-foreground md:grid">
          <span>Name</span>
          <span>Type</span>
          <span>Owner</span>
          <span className="text-right">Updated</span>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
          <Upload className="mb-3 h-5 w-5 text-muted-foreground/50" />
          <p className="text-sm font-medium">No items yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Import a repo or create one manually.
          </p>
          <div className="mt-5 grid w-full max-w-sm overflow-hidden rounded-md border border-border/70 text-left">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 text-sm transition-colors last:border-b-0 hover:bg-muted/30 focus-ring"
              >
                <span className="flex items-center gap-2">
                  <action.icon
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {action.label}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
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
  let counts: Awaited<ReturnType<typeof getSkillCounts>> = {
    total: 0,
    byType: {},
    mine: 0,
  };
  let settings: Awaited<ReturnType<typeof getSettings>> = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  let userRole: Awaited<ReturnType<typeof getUserRole>> = "member";
  try {
    [{ skills, total }, categories, counts, settings, members, userRole] =
      await Promise.all([
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
  const storageConfigured = isS3Configured(settings);
  const isAdmin = userRole === "admin" || userRole === "owner";

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
        s3Configured={storageConfigured}
        memberCount={members.length}
        skillCount={counts.total}
        isAdmin={isAdmin}
      />

      {/* Empty state — registry has no skills */}
      {!hasAnySkills && (
        <EmptyDashboard
          storageConfigured={storageConfigured}
          memberCount={members.length}
          isAdmin={isAdmin}
        />
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
                  ? (counts.byType[tab.type] ?? 0)
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
