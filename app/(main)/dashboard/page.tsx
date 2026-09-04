import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CircleAlert,
  Database,
  FileClock,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type {
  MemorySummary,
  PersonalMemoryStats,
  RepositorySummary,
} from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import {
  MemoryStatusBadge,
  MemoryTypeBadge,
} from "@/components/memory/status-badge";
import { getPrivatePageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { TransitionArrow } from "@/components/ui/transition-arrow";
import { TransitionNumber } from "@/components/ui/transition-number";

export const metadata: Metadata = getPrivatePageMetadata("Overview");
export const dynamic = "force-dynamic";

interface DashboardData {
  published: number;
  drafts: number;
  disputed: number;
  open_reports: number;
  recent: MemorySummary[];
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");

  let dashboard: DashboardData;
  let repositories: { items: RepositorySummary[] };
  let personalMemory: PersonalMemoryStats;
  try {
    [dashboard, repositories, personalMemory] = await Promise.all([
      intertoolApi<DashboardData>("/api/dashboard"),
      intertoolApi<{ items: RepositorySummary[] }>("/api/repositories"),
      intertoolApi<PersonalMemoryStats>("/api/personal-memories/stats"),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }

  const metrics = [
    {
      label: "Published",
      value: dashboard.published,
      icon: ShieldCheck,
      detail: "available to Claude",
      tone: dashboard.published > 0 ? "text-success" : "text-muted-foreground",
    },
    {
      label: "Drafts",
      value: dashboard.drafts,
      icon: FileClock,
      detail: "awaiting confirmation",
      tone: dashboard.drafts > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Open reports",
      value: dashboard.open_reports,
      icon: CircleAlert,
      detail: "need review",
      tone:
        dashboard.open_reports > 0
          ? "text-destructive"
          : "text-muted-foreground",
    },
  ];

  return (
    <div className="t-page-reveal mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-10 border-b border-border-subtle pb-8">
        <div>
          <h1 className="max-w-3xl text-xl leading-tight font-medium tracking-tight text-balance sm:text-2xl">
            The context your team should only have to learn once.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Review what Claude can retrieve, keep every learning attributable,
            and remove stale guidance before it spreads.
          </p>
        </div>
      </div>

      <section aria-labelledby="memory-health" className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="memory-health" className="text-sm font-medium">
            Team memory health
          </h2>
          <Link
            href="/memories"
            className="micro-press rounded-sm text-xs text-muted-foreground hover:text-foreground focus-ring"
          >
            View all
          </Link>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border-subtle bg-card sm:grid-cols-3 sm:divide-x sm:divide-border-subtle">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-start gap-3 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:border-b-0"
            >
              <metric.icon
                className={cn("mt-0.5 h-4 w-4", metric.tone)}
                aria-hidden="true"
              />
              <div>
                <TransitionNumber
                  value={metric.value}
                  className="text-2xl font-semibold tabular-nums"
                />
                <p className="mt-1 text-xs font-medium">{metric.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {metric.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="recent-memories">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-memories" className="text-sm font-medium">
              Recently published
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground">
              {dashboard.recent.length} shown
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-card">
            {dashboard.recent.length ? (
              <div className="divide-y divide-border-subtle">
                {dashboard.recent.map((memory) => (
                  <Link
                    key={memory.id}
                    href={`/memories/${memory.id}`}
                    className="group micro-press grid gap-3 px-4 py-4 hover:bg-muted/25 focus-ring sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <MemoryTypeBadge type={memory.type} />
                        <MemoryStatusBadge status={memory.status} />
                      </div>
                      <h3 className="truncate text-sm font-medium group-hover:text-primary">
                        {memory.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {memory.content}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {memory.repository_full_name ?? "Organisation-wide"}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDate(memory.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                <Database
                  className="mb-3 h-5 w-5 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">No published memories yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Create a draft, verify the wording and source, then publish it
                  for the team.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6" aria-label="Setup status">
          <div className="border-t-2 border-foreground/35 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">My memory</h2>
              </div>
              <div className="flex items-center gap-2">
                <LockKeyhole
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <TransitionNumber
                  value={personalMemory.total}
                  className="text-xl font-semibold tabular-nums"
                />
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Imported documents only you can access. They are separate from
              published team context.
            </p>
            <Link
              href="/my-memory"
              className="t-learn micro-press mt-4 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-ring"
            >
              Open my memory
              <TransitionArrow className="size-3" />
            </Link>
          </div>
          <div className="border-t-2 border-foreground/35 pt-4">
            <h2 className="text-sm font-medium">Claude Code access</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Personal tokens keep each retrieval attributable and independently
              revocable.
            </p>
            <Link
              href="/settings/tokens"
              className="t-learn micro-press mt-4 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-ring"
            >
              Configure MCP
              <TransitionArrow className="size-3" />
            </Link>
          </div>
          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Repositories</p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {repositories.items.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {repositories.items.slice(0, 4).map((repository) => (
                <div
                  key={repository.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate font-mono text-[11px]">
                    {repository.full_name}
                  </span>
                </div>
              ))}
              {!repositories.items.length && (
                <p className="text-xs text-muted-foreground">
                  Register a repository to scope context.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
