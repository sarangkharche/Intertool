export default function SkillDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5">
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <span className="text-xs text-muted-foreground">/</span>
        <div className="h-3 w-10 animate-pulse rounded bg-muted" />
        <span className="text-xs text-muted-foreground">/</span>
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div>
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded bg-muted/50" />
            </div>
            <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
          </div>

          {/* Install command */}
          <div className="mb-6 h-12 animate-pulse rounded-lg border border-border bg-muted/30" />

          {/* Description */}
          <div className="mb-6 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/40" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            <div className="h-8 w-20 animate-pulse rounded bg-muted/50" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted/50" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted/50" />
          </div>

          {/* Content area */}
          <div className="mt-4 h-64 animate-pulse rounded-lg border border-border bg-muted/20" />
        </div>

        {/* Sidebar */}
        <aside className="rounded-lg border border-border">
          <div className="p-4">
            <div className="mb-3 h-3 w-12 animate-pulse rounded bg-muted/50" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div>
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-14 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
            <div className="h-8 animate-pulse rounded bg-muted/30" />
          </div>
          <div className="p-4 space-y-2">
            <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
          </div>
        </aside>
      </div>
    </div>
  );
}
