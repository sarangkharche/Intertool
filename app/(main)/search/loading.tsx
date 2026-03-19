export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
              <div className="h-8 animate-pulse rounded-md bg-muted/30" />
            </div>
          ))}
        </aside>

        {/* Main */}
        <div>
          <div className="mb-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
        </div>
      </div>
    </div>
  );
}
