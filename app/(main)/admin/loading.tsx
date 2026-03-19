export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted/60" />
      </div>

      {/* S3 Storage card */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
              <div className="h-8 animate-pulse rounded-md bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-12 animate-pulse rounded bg-muted/50" />
              <div className="h-8 animate-pulse rounded-md bg-muted/30" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
              <div className="h-8 animate-pulse rounded-md bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Access Control card */}
      <div className="mt-6 rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-3 w-52 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
              <div className="h-5 w-9 animate-pulse rounded-full bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
