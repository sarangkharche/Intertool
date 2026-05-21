import { Command } from "commander";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { bold, check, cross, dim, green, isJsonMode } from "../lib/format.js";

const SKILL_TYPES = [
  "skill",
  "mcp-server",
  "agent-tool",
  "prompt-template",
] as const;

type SkillType = (typeof SKILL_TYPES)[number];

const DEFAULT_CATEGORY_BY_TYPE: Record<SkillType, string> = {
  skill: "dev-tools",
  "mcp-server": "integrations",
  "agent-tool": "dev-tools",
  "prompt-template": "prompts",
};

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    let data = "";
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (chunk) => {
      data = chunk.toString().trim();
      process.stdin.pause();
      resolve(data);
    });
  });
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSkillMd(opts: {
  name: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
}): string {
  const tagList = opts.tags.length
    ? `tags: [${opts.tags.map(yamlString).join(", ")}]\n`
    : "";

  return `---
name: ${yamlString(opts.name)}
type: ${opts.type}
description: ${yamlString(opts.description)}
category: ${opts.category}
${tagList}---

# ${opts.name}

## Overview

A brief description of what this skill does and when to use it.

## Usage

Describe how to use this skill or tool.

\`\`\`bash
# Example command
intertool install @your-username/${slugify(opts.name)}
\`\`\`

## Configuration

List any configuration options or environment variables.

## Examples

Provide concrete examples of the skill in action.
`;
}

export function generateIntertoolYaml(opts: {
  name: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
}): string {
  const tagList = opts.tags.length
    ? `tags: [${opts.tags.map(yamlString).join(", ")}]\n`
    : "";

  return `name: ${yamlString(opts.name)}
type: ${opts.type}
description: ${yamlString(opts.description)}
category: ${opts.category}
${tagList}`;
}

export function generateServerJson(opts: {
  name: string;
  description: string;
}): string {
  return JSON.stringify(
    {
      name: opts.name,
      description: opts.description,
      transport: {
        type: "stdio",
        command: "npx",
        args: [`@your-username/${slugify(opts.name)}`],
      },
    },
    null,
    2
  );
}

export const initCommand = new Command("init")
  .description("Scaffold a new skill in the current directory")
  .option(
    "-t, --type <type>",
    "Skill type: skill, mcp-server, agent-tool, prompt-template"
  )
  .option("-n, --name <name>", "Skill name")
  .option("-d, --description <desc>", "Short description")
  .option("-c, --category <cat>", "Category slug")
  .option("--tags <tags>", "Comma-separated tags")
  .action(
    async (opts: {
      type?: string;
      name?: string;
      description?: string;
      category?: string;
      tags?: string;
    }) => {
      const jsonMode = isJsonMode();

      if (jsonMode) {
        const missing: string[] = [];
        if (!opts.type) missing.push("--type");
        if (!opts.name) missing.push("--name");
        if (!opts.description) missing.push("--description");
        if (missing.length > 0) {
          console.log(
            JSON.stringify({
              created: false,
              error: `Missing required options for --json: ${missing.join(", ")}`,
            })
          );
          process.exit(1);
        }
      } else {
        console.log();
        console.log(bold("  Initialize a new skill"));
        console.log();
      }

      const fail = (message: string): never => {
        if (jsonMode) {
          console.log(JSON.stringify({ created: false, error: message }));
        } else {
          console.error(cross(message));
        }
        process.exit(1);
      };

      const type =
        opts.type && SKILL_TYPES.includes(opts.type as SkillType)
          ? opts.type
          : await prompt(`  Type (${SKILL_TYPES.join(", ")}): `);

      if (!SKILL_TYPES.includes(type as SkillType)) {
        fail(
          `Invalid type: ${type}. Must be one of: ${SKILL_TYPES.join(", ")}`
        );
      }

      const name = opts.name || (await prompt("  Name: "));
      if (!name) {
        fail("Name is required.");
      }

      const description = opts.description || (await prompt("  Description: "));
      if (!description) {
        fail("Description is required.");
      }

      const defaultCategory = DEFAULT_CATEGORY_BY_TYPE[type as SkillType];
      const category =
        opts.category ||
        (jsonMode ? "" : await prompt(`  Category (${defaultCategory}): `)) ||
        defaultCategory;
      const tagsRaw =
        opts.tags ||
        (jsonMode ? "" : await prompt("  Tags (comma-separated): "));
      const tags = tagsRaw
        ? tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      if (!jsonMode) console.log();

      const cwd = process.cwd();
      const createdFiles: string[] = [];
      let publishTarget = "SKILL.md";

      if (type === "mcp-server") {
        const filePath = join(cwd, "server.json");
        if (existsSync(filePath)) {
          fail("server.json already exists in this directory.");
        }
        writeFileSync(filePath, generateServerJson({ name, description }));
        createdFiles.push("server.json");
        if (!jsonMode) console.log(check(`Created ${dim("server.json")}`));

        const readmePath = join(cwd, "README.md");
        if (!existsSync(readmePath)) {
          writeFileSync(
            readmePath,
            `# ${name}\n\n${description}\n\n## Setup\n\n1. Install dependencies\n2. Configure transport\n3. Publish to registry\n`
          );
          createdFiles.push("README.md");
          if (!jsonMode) console.log(check(`Created ${dim("README.md")}`));
        }

        const metadataPath = join(cwd, "intertool.yaml");
        if (!existsSync(metadataPath)) {
          writeFileSync(
            metadataPath,
            generateIntertoolYaml({ name, description, type, category, tags })
          );
          createdFiles.push("intertool.yaml");
          if (!jsonMode) console.log(check(`Created ${dim("intertool.yaml")}`));
        }
        publishTarget = "server.json";
      } else {
        const filePath = join(cwd, "SKILL.md");
        if (existsSync(filePath)) {
          fail("SKILL.md already exists in this directory.");
        }
        writeFileSync(
          filePath,
          generateSkillMd({ name, description, type, category, tags })
        );
        createdFiles.push("SKILL.md");
        if (!jsonMode) console.log(check(`Created ${dim("SKILL.md")}`));
      }

      if (jsonMode) {
        console.log(
          JSON.stringify({
            created: true,
            type,
            name,
            category,
            files: createdFiles,
            next: `intertool publish ${publishTarget}`,
          })
        );
      } else {
        console.log();
        console.log(
          `  ${dim("Next: edit the generated file, then run")} ${green(
            `intertool publish ${publishTarget}`
          )}`
        );
        console.log();
      }
    }
  );
