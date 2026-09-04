import type { MemoryRecord } from "@intertool/db";

export interface RankedMemory extends MemoryRecord {
  score: number;
  matched_paths: string[];
}

function normalisePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function globPrefix(glob: string): string {
  const wildcard = glob.search(/[?*[{]/);
  return normalisePath(
    wildcard === -1 ? glob : glob.slice(0, wildcard)
  ).replace(/\/$/, "");
}

function pathMatches(scope: string, path: string): boolean {
  const normalScope = normalisePath(scope);
  const normalPath = normalisePath(path);
  const prefix = globPrefix(normalScope);
  if (!prefix) return false;
  if (!/[?*[{]/.test(normalScope)) return normalPath === normalScope;
  return normalPath === prefix || normalPath.startsWith(`${prefix}/`);
}

function lexicalScore(memory: MemoryRecord, query: string): number {
  if (memory.text_rank && memory.text_rank > 0) {
    return Math.min(50, Math.round(memory.text_rank * 100));
  }
  const terms = Array.from(
    new Set(query.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? [])
  );
  if (!terms.length) return 0;
  const title = memory.title.toLowerCase();
  const body = `${memory.content} ${memory.tags.join(" ")}`.toLowerCase();
  let points = 0;
  for (const term of terms) {
    if (title.includes(term)) points += 7;
    else if (body.includes(term)) points += 3;
  }
  return Math.min(50, points);
}

export function rankMemories(
  memories: MemoryRecord[],
  input: { repository: string; query: string; paths?: string[] }
): RankedMemory[] {
  const now = Date.now();
  return memories
    .map((memory) => {
      const matchedPaths = memory.paths.filter((scope) =>
        (input.paths ?? []).some((path) => pathMatches(scope, path))
      );
      let score = lexicalScore(memory, input.query);
      score +=
        memory.repository_full_name?.toLowerCase() ===
        input.repository.toLowerCase()
          ? 20
          : 5;
      if (matchedPaths.length) score += 20;
      if (memory.confidence === "confirmed") score += 10;
      if (memory.source_url) score += 5;
      if (now - new Date(memory.updated_at).getTime() > 180 * 86_400_000)
        score -= 10;
      if ((memory.open_report_count ?? 0) > 0) score -= 20;
      return { ...memory, score, matched_paths: matchedPaths };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() ||
        a.id.localeCompare(b.id)
    );
}

const groupOrder = [
  "warning",
  "decision",
  "convention",
  "discovery",
  "ownership",
  "runbook",
] as const;

function safeTruncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const slice = value.slice(0, Math.max(0, limit - 1));
  const boundary = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"));
  return `${slice.slice(0, boundary > limit * 0.6 ? boundary : slice.length).trimEnd()}…`;
}

export function compactContext(
  ranked: RankedMemory[],
  input: {
    repository: string;
    query: string;
    limit: number;
    maxCharacters: number;
  }
) {
  const header = `Shared context for ${input.repository}: ${input.query}`;
  if (!ranked.length) {
    return {
      text: `${header}\n\nNo relevant shared context found.`,
      memories: [],
    };
  }

  const selected: RankedMemory[] = [];
  const lines: string[] = [header];
  const candidates = groupOrder.flatMap((type) =>
    ranked.filter((item) => item.type === type)
  );
  for (const memory of candidates.slice(0, input.limit)) {
    const source = memory.source_url
      ? `${memory.source_label ?? "Source"}: ${memory.source_url}`
      : (memory.source_label ?? `Added by ${memory.author_name}`);
    const prefix = `\n[${memory.type.toUpperCase()}] ${memory.title} (${memory.confidence})`;
    const suffix = `\nSource: ${source}\nUpdated: ${memory.updated_at}`;
    const remaining =
      input.maxCharacters -
      lines.join("\n").length -
      prefix.length -
      suffix.length -
      2;
    if (remaining < 80) break;
    lines.push(
      `${prefix}\n${safeTruncate(memory.content, Math.min(700, remaining))}${suffix}`
    );
    selected.push(memory);
  }
  return {
    text: safeTruncate(lines.join("\n"), input.maxCharacters),
    memories: selected.map((memory) => ({
      id: memory.id,
      type: memory.type,
      title: memory.title,
      content: memory.content,
      source_url: memory.source_url,
      source_label: memory.source_label,
      confidence: memory.confidence,
      updated_at: memory.updated_at,
      score: memory.score,
    })),
  };
}

export function searchExcerpts(ranked: RankedMemory[], limit: number) {
  return ranked.slice(0, limit).map((memory) => ({
    id: memory.id,
    type: memory.type,
    title: memory.title,
    excerpt: safeTruncate(memory.content, 320),
    confidence: memory.confidence,
    source_url: memory.source_url,
    source_label: memory.source_label,
    updated_at: memory.updated_at,
    score: memory.score,
  }));
}
