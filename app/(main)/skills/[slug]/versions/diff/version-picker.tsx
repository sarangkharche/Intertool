"use client";

import { useRouter } from "next/navigation";

interface VersionPickerProps {
  slug: string;
  versions: string[];
  currentVersion: string;
  selectedFrom: string;
  selectedTo: string;
}

export function VersionPicker({
  slug,
  versions,
  currentVersion,
  selectedFrom,
  selectedTo,
}: VersionPickerProps) {
  const router = useRouter();

  const allOptions = currentVersion
    ? [{ value: "current", label: `v${currentVersion} (current)` }, ...versions.map((v) => ({ value: v, label: `v${v}` }))]
    : versions.map((v) => ({ value: v, label: `v${v}` }));

  function navigate(from: string, to: string) {
    router.push(`/skills/${slug}/versions/diff?from=${from}&to=${to}`);
  }

  if (versions.length < 2) return null;

  return (
    <div className="mb-6 flex items-center gap-3">
      <label className="text-xs text-muted-foreground">From</label>
      <select
        value={selectedFrom}
        onChange={(e) => navigate(e.target.value, selectedTo)}
        className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
      >
        {allOptions
          .filter((o) => o.value !== selectedTo)
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>

      <label className="text-xs text-muted-foreground">To</label>
      <select
        value={selectedTo}
        onChange={(e) => navigate(selectedFrom, e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
      >
        {allOptions
          .filter((o) => o.value !== selectedFrom)
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
    </div>
  );
}
