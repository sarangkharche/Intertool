import test from "node:test";
import assert from "node:assert/strict";
import { parseSkillMd, parseServerJson } from "../cli/src/lib/parse";

test("parses SKILL.md frontmatter", () => {
  const parsed = parseSkillMd(`---
name: Code Reviewer
type: skill
description: Reviews pull requests
category: dev-tools
tags: [review, quality]
---

# Body`);

  assert.deepEqual(parsed, {
    name: "Code Reviewer",
    type: "skill",
    description: "Reviews pull requests",
    category: "dev-tools",
    tags: ["review", "quality"],
  });
});

test("parses MCP server.json", () => {
  const parsed = parseServerJson(
    JSON.stringify({
      name: "Internal API",
      description: "Connects to internal APIs",
      transport: {
        type: "stdio",
        command: "npx",
        args: ["internal-api"],
      },
    })
  );

  assert.equal(parsed.name, "Internal API");
  assert.equal(parsed.description, "Connects to internal APIs");
});
