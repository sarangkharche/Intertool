import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, Plus, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type { MemorySummary, RepositorySummary } from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import {
  ConfidenceBadge,
  MemoryStatusBadge,
  MemoryTypeBadge,
} from "@/components/memory/status-badge";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Team memory");
export const dynamic = "force-dynamic";

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/memories");
  const filters = await searchParams;
  const query = new URLSearchParams();
  for (const key of [
    "query",
    "repository_id",
    "type",
    "status",
    "confidence",
    "cursor",
  ]) {
    if (filters[key]) query.set(key, filters[key]);
  }
  query.set("limit", "25");
  let data: { items: MemorySummary[]; next_cursor: string | null };
  let repositories: { items: RepositorySummary[] };
  try {
    [data, repositories] = await Promise.all([
      intertoolApi<{ items: MemorySummary[]; next_cursor: string | null }>(
        `/api/memories?${query}`
      ),
      intertoolApi<{ items: RepositorySummary[] }>("/api/repositories"),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Team memory</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reviewable engineering context with an owner, source and lifecycle.
          </p>
        </div>
        <Link
          href="/memories/new"
          className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" /> New memory
        </Link>
      </div>

      <form
        className="mb-4 grid gap-2 rounded-lg border border-border-subtle bg-surface p-3 md:grid-cols-[minmax(220px,1fr)_repeat(4,auto)_auto]"
        aria-label="Memory filters"
      >
        <label className="relative">
          <Search
            className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Search memories</span>
          <input
            name="query"
            defaultValue={filters.query}
            placeholder="Search title, content or tags"
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <FilterSelect
          name="repository_id"
          label="Repository"
          value={filters.repository_id}
        >
          <option value="">All repositories</option>
          {repositories.items.map((repository) => (
            <option key={repository.id} value={repository.id}>
              {repository.full_name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="type" label="Type" value={filters.type}>
          <option value="">All types</option>
          {[
            "warning",
            "decision",
            "convention",
            "discovery",
            "ownership",
            "runbook",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </FilterSelect>
        <FilterSelect name="status" label="Status" value={filters.status}>
          <option value="">All statuses</option>
          {["draft", "published", "disputed", "archived"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          name="confidence"
          label="Confidence"
          value={filters.confidence}
        >
          <option value="">All confidence</option>
          <option value="confirmed">confirmed</option>
          <option value="tentative">tentative</option>
        </FilterSelect>
        <button className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted focus-ring">
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        {data.items.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_110px_90px] border-b border-border-subtle px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground md:grid">
              <span>Memory</span>
              <span>Repository</span>
              <span>Status</span>
              <span className="text-right">Updated</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {data.items.map((memory) => (
                <Link
                  key={memory.id}
                  href={`/memories/${memory.id}`}
                  className="group grid gap-3 px-4 py-4 hover:bg-muted/25 focus-ring md:grid-cols-[minmax(0,1fr)_150px_110px_90px] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <MemoryTypeBadge type={memory.type} />
                      <ConfidenceBadge confidence={memory.confidence} />
                      {!!memory.open_report_count && (
                        <span className="text-[10px] text-destructive">
                          {memory.open_report_count} open report
                        </span>
                      )}
                    </div>
                    <h2 className="truncate text-sm font-medium group-hover:text-primary">
                      {memory.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {memory.content}
                    </p>
                  </div>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {memory.repository_full_name ?? "Organisation-wide"}
                  </span>
                  <MemoryStatusBadge status={memory.status} />
                  <span className="text-left font-mono text-[10px] text-muted-foreground md:text-right">
                    {formatDate(memory.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <Database className="mb-3 h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-medium">No memories match</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clear the filters or create a sourced draft.
            </p>
            <Link href="/memories/new" className="btn-pill mt-5">
              Create a draft
            </Link>
          </div>
        )}
      </div>

      {data.next_cursor && (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/memories?${new URLSearchParams({ ...Object.fromEntries(query), cursor: data.next_cursor }).toString()}`}
            className="btn-pill"
          >
            Next page
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-9 max-w-40 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {children}
      </select>
    </label>
  );
}
