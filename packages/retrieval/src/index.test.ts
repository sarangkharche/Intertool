import { describe, expect, it } from "vitest";
import type { MemoryRecord } from "@intertool/db";
import { compactContext, rankMemories } from "./index.js";

function memory(overrides: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: crypto.randomUUID(),
    organization_id: "org",
    repository_id: null,
    repository_full_name: null,
    type: "convention",
    title: "Generic engineering convention",
    content: "Keep changes focused and reviewable.",
    status: "published",
    confidence: "tentative",
    paths: [],
    tags: [],
    source_url: null,
    source_label: null,
    created_by: "user",
    author_name: "Alice",
    published_by: "user",
    published_at: "2026-09-01T00:00:00.000Z",
    expires_at: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    open_report_count: 0,
    text_rank: 0,
    ...overrides,
  };
}

describe("deterministic retrieval", () => {
  it("prefers exact repository and path matches", () => {
    const ranked = rankMemories(
      [
        memory({ title: "Organization note" }),
        memory({
          title: "Refund tests require ledger events",
          repository_id: "repo",
          repository_full_name: "acme/payments-service",
          confidence: "confirmed",
          paths: ["tests/refunds/**"],
        }),
      ],
      {
        repository: "acme/payments-service",
        query: "fix refund tests",
        paths: ["tests/refunds/refund.test.ts"],
      }
    );
    expect(ranked[0].title).toBe("Refund tests require ledger events");
  });

  it("penalises an open stale report", () => {
    const ranked = rankMemories(
      [
        memory({ title: "Clean", confidence: "confirmed" }),
        memory({
          title: "Reported",
          confidence: "confirmed",
          open_report_count: 1,
        }),
      ],
      { repository: "acme/payments-service", query: "engineering" }
    );
    expect(ranked[0].title).toBe("Clean");
  });

  it("preserves sources while respecting the character cap", () => {
    const ranked = rankMemories(
      [
        memory({
          content: "x ".repeat(1_000),
          source_url: "https://example.com/pr/1",
        }),
      ],
      { repository: "acme/payments-service", query: "engineering" }
    );
    const result = compactContext(ranked, {
      repository: "acme/payments-service",
      query: "engineering",
      limit: 8,
      maxCharacters: 900,
    });
    expect(result.text.length).toBeLessThanOrEqual(900);
    expect(result.text).toContain("https://example.com/pr/1");
  });

  it("returns an explicit empty result", () => {
    expect(
      compactContext([], {
        repository: "acme/payments-service",
        query: "refunds",
        limit: 8,
        maxCharacters: 4_000,
      }).text
    ).toContain("No relevant shared context found");
  });
});
