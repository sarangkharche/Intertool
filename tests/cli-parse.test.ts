import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSkillMd,
  parseSkillYaml,
  parseServerJson,
} from "../cli/src/lib/parse";
import {
  generateIntertoolYaml,
  generateSkillMd,
} from "../cli/src/commands/init";

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

test("parses skill.yaml metadata", () => {
  const parsed = parseSkillYaml(`name: Code Reviewer
slug: code-reviewer
type: skill
description: Reviews pull requests
category: dev-tools
tags:
  - review
  - quality
compatibility:
  - Claude Code
readme: "# Code Reviewer"
`);

  assert.deepEqual(parsed, {
    name: "Code Reviewer",
    slug: "code-reviewer",
    type: "skill",
    description: "Reviews pull requests",
    category: "dev-tools",
    tags: ["review", "quality"],
    compatibility: ["Claude Code"],
    readme: "# Code Reviewer",
  });
});

test("parses MCP server.json", () => {
  const serverJson = {
    name: "Internal API",
    description: "Connects to internal APIs",
    transport: {
      type: "stdio",
      command: "npx",
      args: ["internal-api"],
    },
  };
  const parsed = parseServerJson(JSON.stringify(serverJson));

  assert.equal(parsed.name, "Internal API");
  assert.equal(parsed.description, "Connects to internal APIs");
  assert.equal(parsed.transport, "stdio");
  assert.deepEqual(parsed.config, serverJson);
});

test("init generates publishable SKILL.md metadata", () => {
  const content = generateSkillMd({
    name: "Code Reviewer",
    description: "Reviews pull requests",
    type: "agent-tool",
    category: "dev-tools",
    tags: ["review"],
  });

  const parsed = parseSkillMd(content);

  assert.equal(parsed.name, "Code Reviewer");
  assert.equal(parsed.type, "agent-tool");
  assert.equal(parsed.description, "Reviews pull requests");
  assert.equal(parsed.category, "dev-tools");
  assert.deepEqual(parsed.tags, ["review"]);
});

test("init generates Intertool metadata sidecar for MCP servers", () => {
  const content = generateIntertoolYaml({
    name: "Internal API",
    description: "Connects to internal APIs",
    type: "mcp-server",
    category: "integrations",
    tags: ["api"],
  });

  const parsed = parseSkillYaml(content);

  assert.equal(parsed.name, "Internal API");
  assert.equal(parsed.type, "mcp-server");
  assert.equal(parsed.description, "Connects to internal APIs");
  assert.equal(parsed.category, "integrations");
  assert.deepEqual(parsed.tags, ["api"]);
});
