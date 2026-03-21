"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface DownloadStatsProps {
  slug: string;
}

interface Stats {
  today: number;
  week: number;
  month: number;
  total: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function DownloadStats({ slug }: DownloadStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/skills/${slug}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data as Stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Download className="h-3 w-3" />
            Downloads
          </span>
          <div className="h-3.5 w-8 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Download className="h-3 w-3" />
          Downloads
        </span>
        <span className="font-mono text-xs">{formatCount(stats.total)}</span>
      </div>
      {stats.week > 0 && (
        <div className="flex items-center justify-between pl-[18px]">
          <span className="text-xs text-muted-foreground/70">This week</span>
          <span className="font-mono text-xs text-muted-foreground">{formatCount(stats.week)}</span>
        </div>
      )}
    </div>
  );
}

export function DownloadBadge({ slug }: DownloadStatsProps) {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/skills/${slug}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data as Stats).total > 0) setTotal((data as Stats).total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Download className="h-3 w-3" />
        <span className="inline-block h-3 w-6 animate-pulse rounded bg-muted" />
      </span>
    );
  }

  if (total === null) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Download className="h-3 w-3" />
      {formatCount(total)}
    </span>
  );
}
