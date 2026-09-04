import { describe, expect, it } from "vitest";
import {
  createMemorySchema,
  createRepositorySchema,
  detectSecretLikeContent,
  personalMemoryImportSchema,
  proposeMemorySchema,
} from "./index.js";

describe("memory contracts", () => {
  it("normalizes GitHub repository URLs and shorthand", () => {
    for (const [input, expected] of [
      ["acme/payments-service", "acme/payments-service"],
      ["https://github.com/acme/payments-service", "acme/payments-service"],
      [
        "https://github.com/acme/payments-service.git/",
        "acme/payments-service",
      ],
    ]) {
      expect(
        createRepositorySchema.parse({
          full_name: input,
          default_branch: "main",
        }).full_name
      ).toBe(expected);
    }
  });

  it("rejects non-GitHub and nested GitHub URLs", () => {
    for (const full_name of [
      "https://example.com/acme/payments-service",
      "https://github.com/acme/payments-service/issues",
    ]) {
      const result = createRepositorySchema.safeParse({
        full_name,
        default_branch: "main",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Enter owner/repository or its GitHub URL"
        );
      }
    }
  });

  it("accepts repository-relative glob scopes", () => {
    expect(
      createMemorySchema.safeParse({
        type: "warning",
        title: "Refund tests need Redis",
        content: "Run Redis before the refund integration tests.",
        confidence: "confirmed",
        paths: ["tests/refunds/**"],
        tags: ["tests"],
      }).success
    ).toBe(true);
  });

  it("rejects absolute and traversing paths", () => {
    for (const path of ["/etc/passwd", "src/../../secret"]) {
      expect(
        proposeMemorySchema.safeParse({
          type: "warning",
          title: "Unsafe path example",
          content: "This content is deliberately long enough.",
          paths: [path],
        }).success
      ).toBe(false);
    }
  });

  it("detects high-confidence secrets", () => {
    expect(
      detectSecretLikeContent("api_key=abcdefghijklmnopqrstuvwxyz1234")
    ).toBe("credential");
    expect(
      detectSecretLikeContent("Run Redis and set ENABLE_EVENTS=true")
    ).toBeNull();
  });

  it("accepts private memory documents and rejects unsafe source keys", () => {
    expect(
      personalMemoryImportSchema.safeParse({
        source_kind: "codex_local",
        source_key: "rollout_summaries/example.md",
        title: "Example memory",
        content: "A durable personal memory document.",
        metadata: { bytes: 35 },
      }).success
    ).toBe(true);
    expect(
      personalMemoryImportSchema.safeParse({
        source_kind: "codex_local",
        source_key: "../outside.md",
        title: "Unsafe memory",
        content: "This source key escapes the memory root.",
      }).success
    ).toBe(false);
  });
});
