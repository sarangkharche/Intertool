import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, LockKeyhole, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type {
  PersonalMemoryStats,
  PersonalMemorySummary,
} from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import { getPrivatePageMetadata } from "@/lib/seo";
import { PersonalMemoryOverview } from "@/components/memory/personal-memory-overview";

export const metadata: Metadata = getPrivatePageMetadata("My memory");
export const dynamic = "force-dynamic";

function sourceLabel(source: string): string {
  return source === "codex_local"
    ? "Codex local memory"
    : source.replaceAll("_", " ");
}

export default async function MyMemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/my-memory");
  const filters = await searchParams;
  const query = new URLSearchParams({ limit: "50" });
  if (filters.query) query.set("query", filters.query);
  if (filters.source_kind) query.set("source_kind", filters.source_kind);
  if (filters.cursor) query.set("cursor", filters.cursor);

  let data: { items: PersonalMemorySummary[]; next_cursor: string | null };
  let stats: PersonalMemoryStats;
  try {
    [data, stats] = await Promise.all([
      intertoolApi<{
        items: PersonalMemorySummary[];
        next_cursor: string | null;
      }>(`/api/personal-memories?${query}`),
      intertoolApi<PersonalMemoryStats>("/api/personal-memories/stats"),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }

  return (
    <div className="t-page-reveal mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-7 grid gap-5 border-b border-border-subtle pb-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <h1 className="text-lg font-medium tracking-tight">My memory</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Your imported agent memory in one searchable place. These documents
            belong to you, across organisations.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-information/20 bg-information/5 p-4">
          <LockKeyhole
            className="mt-0.5 h-4 w-4 shrink-0 text-information"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-medium">Private by default</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Not visible to your team and never returned by team MCP search.
              Engineering extraction will create reviewable drafts later.
            </p>
          </div>
        </div>
      </div>

      <PersonalMemoryOverview stats={stats} />

      <form
        className="mb-4 grid gap-2 rounded-lg border border-border-subtle bg-surface p-3 sm:grid-cols-[minmax(220px,1fr)_auto_auto]"
        aria-label="Personal memory filters"
      >
        <label className="relative">
          <Search
            className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Search personal memory</span>
          <input
            name="query"
            defaultValue={filters.query}
            placeholder="Search your imported memory"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label>
          <span className="sr-only">Source</span>
          <select
            name="source_kind"
            defaultValue={filters.source_kind ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">All sources</option>
            {stats.sources.map((source) => (
              <option key={source.source_kind} value={source.source_kind}>
                {sourceLabel(source.source_kind)} ({source.count})
              </option>
            ))}
          </select>
        </label>
        <button className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted focus-ring">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        {data.items.length ? (
          <div className="divide-y divide-border-subtle">
            {data.items.map((memory) => (
              <Link
                key={memory.id}
                href={`/my-memory/${memory.id}`}
                className="group grid gap-3 px-4 py-4 transition-colors hover:bg-muted/25 focus-ring sm:grid-cols-[minmax(0,1fr)_180px_90px] sm:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium group-hover:text-primary">
                    {memory.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {memory.content}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {sourceLabel(memory.source_kind)}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {memory.source_key}
                  </p>
                </div>
                <p className="text-left font-mono text-[10px] text-muted-foreground sm:text-right">
                  {formatDate(memory.updated_at)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <Database className="mb-3 h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {stats.total ? "No memory matches" : "Your vault is empty"}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              {stats.total
                ? "Clear the filters to see every imported document."
                : "Run the Codex memory importer after creating a personal API token."}
            </p>
            {!stats.total && (
              <code className="mt-4 rounded-md border border-border bg-background px-3 py-2 font-mono text-[10px]">
                pnpm memory:import:codex
              </code>
            )}
          </div>
        )}
      </div>

      {data.next_cursor && (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/my-memory?${new URLSearchParams({
              ...(filters.query ? { query: filters.query } : {}),
              ...(filters.source_kind
                ? { source_kind: filters.source_kind }
                : {}),
              cursor: data.next_cursor,
            }).toString()}`}
            className="btn-pill"
          >
            Next page
          </Link>
        </div>
      )}
    </div>
  );
}
