import test from "node:test";
import assert from "node:assert/strict";
import {
  generateInstallCommands,
  sanitizeSkillFilePath,
} from "../lib/registry";

test("sanitizes package file paths without allowing traversal", () => {
  assert.equal(sanitizeSkillFilePath("../SKILL.md"), "SKILL.md");
  assert.equal(
    sanitizeSkillFilePath("docs/../../README!.md"),
    "docs/README-.md"
  );
  assert.throws(() => sanitizeSkillFilePath("../.."));
});

test("generates CLI install command for non-MCP items", () => {
  const commands = generateInstallCommands({
    type: "skill",
    slug: "code-review",
    author: "team",
  });

  assert.equal(
    commands["Intertool CLI"],
    "npx intertool install @team/code-review"
  );
});

test("generates transport-specific MCP commands", () => {
  const commands = generateInstallCommands({
    type: "mcp-server",
    slug: "internal-api",
    author: "team",
    transport: "streamable-http",
    source_url: "https://mcp.example.com",
  });

  assert.equal(
    commands["Claude Code"],
    "claude mcp add --transport streamable-http internal-api https://mcp.example.com"
  );
  assert.ok(commands["Cursor"].includes(".cursor/mcp.json"));
});
