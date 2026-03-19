export default function EditSkillLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-1 h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-4 w-64 animate-pulse rounded bg-muted/60" />

      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-4">
          <div className="mb-2 h-4 w-20 animate-pulse rounded bg-muted/60" />
          <div className="h-9 animate-pulse rounded-md border border-border bg-muted/20" />
        </div>
      ))}

      {/* Description textarea */}
      <div className="mb-4">
        <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-32 animate-pulse rounded-md border border-border bg-muted/20" />
      </div>

      <div className="mt-6 flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted/50" />
      </div>
    </div>
  );
}
