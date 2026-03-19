"use client";

import { usePreferences } from "@/lib/use-preferences";

export default function DashboardLoading() {
  const [prefs] = usePreferences();
  const isListView = prefs.defaultView === "list";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border-subtle">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-t bg-muted/50" />
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex gap-2">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Results count + view toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Skeleton: grid or list based on preference */}
      {isListView ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                </div>
                <div className="mt-1.5 h-3 w-3/4 animate-pulse rounded bg-muted/40" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-muted/60" />
                </div>
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted/50" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
