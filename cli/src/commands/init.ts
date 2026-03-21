import { Command } from "commander";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { bold, green, dim, cross, check } from "../lib/format.js";

const SKILL_TYPES = ["skill", "mcp-server", "agent-tool", "prompt-template"] as const;

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

function generateSkillMd(opts: {
  name: string;
  description: string;
  type: string;
  tags: string[];
}): string {
  const tagList = opts.tags.length ? `\ntags: [${opts.tags.map((t) => `"${t}"`).join(", ")}]` : "";
  return `---
name: ${opts.name}
description: ${opts.description}${tagList}
---

# ${opts.name}

## Overview

A brief description of what this skill does and when to use it.

## Usage

Describe how to use this skill or tool.

\`\`\`bash
# Example command
intertool install @your-username/${opts.name.toLowerCase().replace(/\s+/g, "-")}
\`\`\`

## Configuration

List any configuration options or environment variables.

## Examples

Provide concrete examples of the skill in action.
`;
}

function generateServerJson(opts: {
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
        args: [`@your-username/${opts.name.toLowerCase().replace(/\s+/g, "-")}`],
      },
    },
    null,
    2,
  );
}

export const initCommand = new Command("init")
  .description("Scaffold a new skill in the current directory")
  .option("-t, --type <type>", "Skill type: skill, mcp-server, agent-tool, prompt-template")
  .option("-n, --name <name>", "Skill name")
  .option("-d, --description <desc>", "Short description")
  .option("--tags <tags>", "Comma-separated tags")
  .action(async (opts: { type?: string; name?: string; description?: string; tags?: string }) => {
    console.log();
    console.log(bold("  Initialize a new skill"));
    console.log();

    const type = opts.type && SKILL_TYPES.includes(opts.type as typeof SKILL_TYPES[number])
      ? opts.type
      : await prompt(`  Type (${SKILL_TYPES.join(", ")}): `);

    if (!SKILL_TYPES.includes(type as typeof SKILL_TYPES[number])) {
      console.error(cross(`Invalid type: ${type}. Must be one of: ${SKILL_TYPES.join(", ")}`));
      process.exit(1);
    }

    const name = opts.name || await prompt("  Name: ");
    if (!name) {
      console.error(cross("Name is required."));
      process.exit(1);
    }

    const description = opts.description || await prompt("  Description: ");
    const tagsRaw = opts.tags || await prompt("  Tags (comma-separated): ");
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    console.log();

    const cwd = process.cwd();

    if (type === "mcp-server") {
      const filePath = join(cwd, "server.json");
      if (existsSync(filePath)) {
        console.error(cross("server.json already exists in this directory."));
        process.exit(1);
      }
      writeFileSync(filePath, generateServerJson({ name, description }));
      console.log(check(`Created ${dim("server.json")}`));

      // Also create a README
      const readmePath = join(cwd, "README.md");
      if (!existsSync(readmePath)) {
        writeFileSync(readmePath, `# ${name}\n\n${description}\n\n## Setup\n\n1. Install dependencies\n2. Configure transport\n3. Publish to registry\n`);
        console.log(check(`Created ${dim("README.md")}`));
      }
    } else {
      const filePath = join(cwd, "SKILL.md");
      if (existsSync(filePath)) {
        console.error(cross("SKILL.md already exists in this directory."));
        process.exit(1);
      }
      writeFileSync(filePath, generateSkillMd({ name, description, type, tags }));
      console.log(check(`Created ${dim("SKILL.md")}`));
    }

    console.log();
    console.log(`  ${dim("Next: edit the generated file, then run")} ${green("intertool publish")}`);
    console.log();
  });
