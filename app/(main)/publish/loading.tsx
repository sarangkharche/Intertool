export default function PublishLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 h-6 w-24 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-4 w-80 animate-pulse rounded bg-muted/60" />

      {/* Type selector */}
      <div className="mb-6">
        <div className="mb-2 h-4 w-16 animate-pulse rounded bg-muted/60" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/30" />
          ))}
        </div>
      </div>

      {/* Name field */}
      <div className="mb-4">
        <div className="mb-2 h-4 w-20 animate-pulse rounded bg-muted/60" />
        <div className="h-9 animate-pulse rounded-md border border-border bg-muted/20" />
      </div>

      {/* Slug field */}
      <div className="mb-4">
        <div className="mb-2 h-4 w-12 animate-pulse rounded bg-muted/60" />
        <div className="h-9 animate-pulse rounded-md border border-border bg-muted/20" />
      </div>

      {/* Description field */}
      <div className="mb-4">
        <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-32 animate-pulse rounded-md border border-border bg-muted/20" />
      </div>

      {/* Submit button */}
      <div className="mt-6 h-9 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
