"use client";

import { ShiningText } from "@/components/ui/shining-text";

const metrics = ["Published", "Drafts", "Open reports"];

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-muted motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-10 border-b border-border-subtle pb-8">
        <ShiningText
          text="Loading team memory…"
          className="text-xl leading-tight font-medium sm:text-2xl"
          role="status"
          aria-live="polite"
        />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3.5 w-full max-w-xl" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
      </div>

      <section className="mb-10" aria-label="Loading team memory health">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border-subtle bg-card sm:grid-cols-3 sm:divide-x sm:divide-border-subtle">
          {metrics.map((metric) => (
            <div
              key={metric}
              className="flex items-start gap-3 border-b border-border-subtle px-4 py-4 last:border-b-0 sm:border-b-0"
            >
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-7 w-8" />
                <Skeleton className="mt-2 h-3 w-20" />
                <Skeleton className="mt-2 h-2.5 w-28 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-label="Loading recently published memories">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="min-h-56 overflow-hidden rounded-lg border border-border-subtle bg-card p-4">
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="grid gap-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6" aria-label="Loading setup status">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={
                index < 2
                  ? "border-t-2 border-foreground/35 pt-4"
                  : "border-t border-border-subtle pt-4"
              }
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
              <Skeleton className="mt-4 h-3 w-24" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
