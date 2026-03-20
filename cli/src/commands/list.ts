import { Command } from "commander";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { bold, dim, cyan, isJsonMode } from "../lib/format.js";

interface InstalledItem {
  name: string;
  type: "skill" | "mcp-server";
  path: string;
}

export const listCommand = new Command("list")
  .alias("ls")
  .description("List locally installed skills and MCP servers")
  .action(() => {
    const items: InstalledItem[] = [];

    const skillsDir = join(process.cwd(), ".claude", "skills");
    if (existsSync(skillsDir)) {
      for (const dir of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const skillPath = join(skillsDir, dir.name, "SKILL.md");
        if (existsSync(skillPath)) {
          items.push({
            name: dir.name,
            type: "skill",
            path: `.claude/skills/${dir.name}/`,
          });
        }
      }
    }

    const mcpDir = join(process.cwd(), ".claude", "mcp-servers");
    if (existsSync(mcpDir)) {
      for (const dir of readdirSync(mcpDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const serverPath = join(mcpDir, dir.name, "server.json");
        if (existsSync(serverPath)) {
          items.push({
            name: dir.name,
            type: "mcp-server",
            path: `.claude/mcp-servers/${dir.name}/`,
          });
        }
      }
    }

    if (isJsonMode()) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log(dim("No skills or MCP servers installed in this project."));
      console.log(dim(`Run: intertool search <query>`));
      return;
    }

    console.log(bold(`${items.length} installed:\n`));
    for (const item of items) {
      const typeLabel = dim(`[${item.type}]`.padEnd(14));
      console.log(`  ${cyan(item.name)}  ${typeLabel}  ${dim(item.path)}`);
    }
  });
