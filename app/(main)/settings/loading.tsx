export default function SettingsLoading() {
  return (
    <div>
      {/* Heading */}
      <div className="mb-6">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted/60" />
      </div>

      {/* 2-card grid matching hub page */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/70 p-4">
            <div className="mb-2 h-8 w-8 animate-pulse rounded-md bg-muted/60" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
