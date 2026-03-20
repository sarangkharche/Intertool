import { Command } from "commander";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { check, cross, dim, bold } from "../lib/format.js";

export const removeCommand = new Command("remove")
  .alias("rm")
  .description("Remove an installed skill or MCP server")
  .argument("<name>", "Skill or server name")
  .action((name: string) => {
    const slug = name.replace(/^@[^/]+\//, "");

    const skillDir = join(process.cwd(), ".claude", "skills", slug);
    const mcpDir = join(process.cwd(), ".claude", "mcp-servers", slug);

    if (existsSync(skillDir)) {
      rmSync(skillDir, { recursive: true });
      console.log(check(`Removed skill ${bold(slug)}`));
      console.log(dim(`  Deleted .claude/skills/${slug}/`));
      return;
    }

    if (existsSync(mcpDir)) {
      rmSync(mcpDir, { recursive: true });
      console.log(check(`Removed MCP server ${bold(slug)}`));
      console.log(dim(`  Deleted .claude/mcp-servers/${slug}/`));
      return;
    }

    console.log(cross(`${bold(slug)} is not installed in this project.`));
    process.exit(1);
  });
