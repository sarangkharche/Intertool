import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  History,
  ShieldAlert,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type {
  MeResponse,
  MemorySummary,
  RepositorySummary,
} from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import {
  ConfidenceBadge,
  MemoryStatusBadge,
  MemoryTypeBadge,
} from "@/components/memory/status-badge";
import {
  MemoryActions,
  ReportMemory,
  ResolveReport,
} from "@/components/memory/memory-actions";
import { MemoryForm } from "@/components/memory/memory-form";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Memory detail");
export const dynamic = "force-dynamic";

interface Version {
  id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  created_at: string;
  changed_by_name: string;
}
interface Report {
  id: string;
  reason: string;
  comment: string;
  created_at: string;
  resolved_at: string | null;
  reported_by_name: string;
}

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await auth())?.user) redirect("/sign-in");
  const { id } = await params;
  let detail: { memory: MemorySummary; versions: Version[]; reports: Report[] };
  let repositories: { items: RepositorySummary[] };
  let me: MeResponse;
  try {
    [detail, repositories, me] = await Promise.all([
      intertoolApi<{
        memory: MemorySummary;
        versions: Version[];
        reports: Report[];
      }>(`/api/memories/${id}`),
      intertoolApi<{ items: RepositorySummary[] }>("/api/repositories"),
      intertoolApi<MeResponse>("/api/me"),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }
  const { memory, versions, reports } = detail;
  const admin = me.user.role === "owner" || me.user.role === "admin";
  const canManage = admin || memory.created_by === me.user.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <Link
        href="/memories"
        className="mb-7 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All memories
      </Link>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <MemoryTypeBadge type={memory.type} />
            <MemoryStatusBadge status={memory.status} />
            <ConfidenceBadge confidence={memory.confidence} />
          </div>
          <h1 className="text-lg font-medium tracking-tight">{memory.title}</h1>
          <p className="mt-6 whitespace-pre-wrap text-[15px] leading-7">
            {memory.content}
          </p>

          <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2">
            <Meta
              label="Repository"
              value={memory.repository_full_name ?? "Organisation-wide"}
            />
            <Meta label="Author" value={memory.author_name} />
            <Meta
              label="Path scope"
              value={
                memory.paths.length ? memory.paths.join(", ") : "All paths"
              }
              mono
            />
            <Meta label="Updated" value={formatDate(memory.updated_at)} />
          </dl>

          {(memory.source_url || memory.source_label) && (
            <section className="mt-8 border-l-2 border-primary pl-4">
              <h2 className="text-xs font-medium">Source</h2>
              {memory.source_url ? (
                <a
                  href={memory.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {memory.source_label ?? memory.source_url}{" "}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-1 text-sm">{memory.source_label}</p>
              )}
            </section>
          )}

          {canManage && (
            <details className="mt-10 border-t border-border-subtle pt-6">
              <summary className="cursor-pointer text-sm font-medium">
                Edit memory
              </summary>
              <div className="mt-6">
                <MemoryForm repositories={repositories.items} memory={memory} />
              </div>
            </details>
          )}

          <section
            className="mt-10 border-t border-border-subtle pt-6"
            aria-labelledby="history-title"
          >
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 id="history-title" className="text-sm font-medium">
                Version history
              </h2>
            </div>
            {versions.length ? (
              <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between gap-4 px-3 py-3 text-xs"
                  >
                    <span>
                      Version {version.version_number} · changed by{" "}
                      {version.changed_by_name}
                    </span>
                    <time className="font-mono text-[10px] text-muted-foreground">
                      {formatDate(version.created_at)}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No prior published versions.
              </p>
            )}
          </section>
        </main>

        <aside className="space-y-7">
          <div className="border-t-2 border-foreground pt-4">
            <h2 className="mb-3 text-xs font-medium">Lifecycle</h2>
            <MemoryActions
              id={memory.id}
              title={memory.title}
              status={memory.status}
              canManage={canManage}
              canDispute={admin}
            />
          </div>
          <div className="border-t border-border-subtle pt-4">
            <ReportMemory id={memory.id} />
          </div>
          {reports.length > 0 && (
            <div className="border-t border-border-subtle pt-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <h2 className="text-xs font-medium">Reports</h2>
              </div>
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="text-xs">
                    <p
                      className={`font-mono text-[10px] uppercase ${report.resolved_at ? "text-muted-foreground" : "text-destructive"}`}
                    >
                      {report.reason}
                      {report.resolved_at ? " · resolved" : ""}
                    </p>
                    <p className="mt-1 leading-5 text-muted-foreground">
                      {report.comment}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {report.reported_by_name} ·{" "}
                      {formatDate(report.created_at)}
                    </p>
                    {admin && !report.resolved_at && (
                      <ResolveReport
                        memoryId={memory.id}
                        reportId={report.id}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-border-subtle pt-4 text-[11px] leading-5 text-muted-foreground">
            <GitBranch className="mb-2 h-4 w-4" />
            Repository code and checked-in instructions always outrank shared
            memories.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 truncate text-xs ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
