"use client";

import { useEffect, useState } from "react";
import { parseDiffFromFile } from "@pierre/diffs";
import type { FileDiffMetadata } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { createElement } from "react";
import type { Skill } from "@/lib/types";

interface VersionDiffProps {
  oldVersion: string;
  newVersion: string;
  oldContent: string;
  newContent: string;
  oldSnapshot?: Skill | null;
  newSnapshot?: Skill | null;
}

interface MetadataChange {
  field: string;
  old: string;
  new: string;
}

function getMetadataChanges(
  oldSnap: Skill | null | undefined,
  newSnap: Skill | null | undefined
): MetadataChange[] {
  if (!oldSnap || !newSnap) return [];
  const changes: MetadataChange[] = [];

  const fields: { key: keyof Skill; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "type", label: "Type" },
    { key: "category_slug", label: "Category" },
    { key: "transport", label: "Transport" },
    { key: "source_url", label: "Source URL" },
  ];

  for (const { key, label } of fields) {
    const oldVal = String(oldSnap[key] ?? "");
    const newVal = String(newSnap[key] ?? "");
    if (oldVal !== newVal) {
      changes.push({ field: label, old: oldVal, new: newVal });
    }
  }

  const oldTags = (oldSnap.tags ?? []).join(", ");
  const newTags = (newSnap.tags ?? []).join(", ");
  if (oldTags !== newTags) {
    changes.push({ field: "Tags", old: oldTags, new: newTags });
  }

  const oldCompat = (oldSnap.compatibility ?? []).join(", ");
  const newCompat = (newSnap.compatibility ?? []).join(", ");
  if (oldCompat !== newCompat) {
    changes.push({ field: "Compatibility", old: oldCompat, new: newCompat });
  }

  return changes;
}

export function VersionDiff({
  oldVersion,
  newVersion,
  oldContent,
  newContent,
  oldSnapshot,
  newSnapshot,
}: VersionDiffProps) {
  const [fileDiff, setFileDiff] = useState<FileDiffMetadata | null>(null);

  useEffect(() => {
    const diff = parseDiffFromFile(
      { name: `v${oldVersion}.md`, contents: oldContent },
      { name: `v${newVersion}.md`, contents: newContent }
    );
    setFileDiff(diff);
  }, [oldVersion, newVersion, oldContent, newContent]);

  const metadataChanges = getMetadataChanges(oldSnapshot, newSnapshot);
  const hasReadmeChanges = fileDiff && fileDiff.hunks.length > 0;

  if (!fileDiff) return null;

  if (!hasReadmeChanges && metadataChanges.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No changes between these versions.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {metadataChanges.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Metadata changes
          </h3>
          <div className="rounded-lg border border-border divide-y divide-border">
            {metadataChanges.map((change) => (
              <div key={change.field} className="flex items-start gap-4 p-3 text-sm">
                <span className="w-28 shrink-0 font-medium text-muted-foreground">
                  {change.field}
                </span>
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-xs text-red-400 line-through">
                  {change.old || "(empty)"}
                </span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="rounded bg-green-500/10 px-1.5 py-0.5 font-mono text-xs text-green-400">
                  {change.new || "(empty)"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasReadmeChanges && (
        <div>
          {metadataChanges.length > 0 && (
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Readme changes
            </h3>
          )}
          <div className="overflow-hidden rounded-lg border border-border">
            {createElement(
              FileDiff as React.ComponentType<{
                fileDiff: FileDiffMetadata;
                options?: Record<string, unknown>;
              }>,
              {
                fileDiff,
                options: { theme: "github-dark" },
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
