import test from "node:test";
import assert from "node:assert/strict";
import { validateSkillInput } from "../lib/validation";

test("accepts a valid skill publish payload", () => {
  const result = validateSkillInput({
    slug: "code-reviewer",
    name: "Code Reviewer",
    type: "skill",
    description: "Reviews code for common issues",
    tags: ["review", "quality"],
    readme: "# Code Reviewer",
    source_url: "https://github.com/example/code-reviewer",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects reserved slugs and invalid URLs", () => {
  const result = validateSkillInput({
    slug: "settings",
    name: "Settings",
    type: "skill",
    description: "Invalid reserved slug",
    source_url: "not a url",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.map((error) => error.field),
    ["slug", "source_url"]
  );
});

test("rejects invalid tags and transports", () => {
  const result = validateSkillInput({
    slug: "my-server",
    name: "My Server",
    type: "mcp-server",
    description: "Connects to an API",
    tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
    transport: "websocket",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field === "tags"));
  assert.ok(result.errors.some((error) => error.field === "transport"));
});
