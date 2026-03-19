export default function TeamsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-2 h-6 w-20 animate-pulse rounded bg-muted" />
      <div className="mb-6 h-4 w-56 animate-pulse rounded bg-muted/60" />

      <div className="rounded-lg border border-border">
        <div className="border-b border-border p-4">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border p-3">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
