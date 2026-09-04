import type { PersonalMemoryStats } from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import { TransitionNumber } from "@/components/ui/transition-number";

const MAX_VISIBLE_COLLECTIONS = 6;

function humanize(value: string): string {
  if (!value) return "Root files";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function sourceLabel(source: string): string {
  return source === "codex_local" ? "Codex local memory" : humanize(source);
}

function visibleCollections(stats: PersonalMemoryStats) {
  if (stats.collections.length <= MAX_VISIBLE_COLLECTIONS) {
    return stats.collections;
  }

  const visible = stats.collections.slice(0, MAX_VISIBLE_COLLECTIONS - 1);
  const hidden = stats.collections.slice(MAX_VISIBLE_COLLECTIONS - 1);
  return [
    ...visible,
    {
      source_kind: "",
      collection_key: "other",
      count: hidden.reduce((total, collection) => total + collection.count, 0),
    },
  ];
}

export function PersonalMemoryOverview({
  stats,
}: {
  stats: PersonalMemoryStats;
}) {
  const collections = visibleCollections(stats);
  const showDistribution = stats.total >= 4 && collections.length >= 2;

  if (!showDistribution) {
    return (
      <section aria-labelledby="vault-status" className="mb-8">
        <h2 id="vault-status" className="sr-only">
          Vault status
        </h2>
        <div className="grid overflow-hidden rounded-lg border border-border-subtle bg-surface sm:grid-cols-3 sm:divide-x sm:divide-border-subtle">
          <div className="px-4 py-4">
            <TransitionNumber
              value={stats.total}
              className="text-2xl font-semibold tabular-nums"
            />
            <p className="mt-1 text-xs font-medium">Documents</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              stored in your private vault
            </p>
          </div>
          <div className="border-t border-border-subtle px-4 py-4 sm:border-t-0">
            <TransitionNumber
              value={stats.sources.length}
              className="text-2xl font-semibold tabular-nums"
            />
            <p className="mt-1 text-xs font-medium">Sources</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              connected memory systems
            </p>
          </div>
          <div className="border-t border-border-subtle px-4 py-4 sm:border-t-0">
            <p className="text-sm font-medium">
              {formatDate(stats.last_imported_at)}
            </p>
            <p className="mt-2 text-xs font-medium">Last import</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              reruns update changed documents
            </p>
          </div>
        </div>
      </section>
    );
  }

  const multipleSources = stats.sources.length > 1;

  return (
    <section
      aria-labelledby="memory-collections"
      className="mb-8 border-b border-border-subtle pb-8"
    >
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h2 id="memory-collections" className="text-sm font-medium">
            Memory by collection
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {stats.total} documents grouped by their imported path.
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Last import · {formatDate(stats.last_imported_at)}
          </p>
        </div>

        <ol
          className="t-bar-list space-y-3.5"
          aria-label="Personal memory documents by collection"
        >
          {collections.map((collection) => {
            const percentage = Math.round(
              (collection.count / stats.total) * 100
            );
            return (
              <li
                key={`${collection.source_kind}:${collection.collection_key}`}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <span className="font-medium">
                      {humanize(collection.collection_key)}
                    </span>
                    {multipleSources && collection.source_kind && (
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {sourceLabel(collection.source_kind)}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {collection.count}
                    <span className="ml-2 text-[10px]">{percentage}%</span>
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="t-bar-reveal h-full rounded-full bg-chart-1"
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
