import { Command } from "commander";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { bold, dim, isJsonMode, table } from "../lib/format.js";

type InstalledType = "skill" | "mcp-server" | "agent-tool" | "prompt-template";

interface InstalledItem {
  name: string;
  slug: string;
  type: InstalledType;
  path: string;
  version?: string;
  registry?: string;
}

interface InstalledMetadata {
  slug?: string;
  name?: string;
  type?: InstalledType;
  version?: string;
  registry?: string;
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
          const metadata = readMetadata(join(skillsDir, dir.name));
          items.push({
            name: metadata.name ?? dir.name,
            slug: metadata.slug ?? dir.name,
            type: metadata.type ?? "skill",
            path: `.claude/skills/${dir.name}/`,
            version: metadata.version,
            registry: metadata.registry,
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
          const metadata = readMetadata(join(mcpDir, dir.name));
          items.push({
            name: metadata.name ?? dir.name,
            slug: metadata.slug ?? dir.name,
            type: metadata.type ?? "mcp-server",
            path: `.claude/mcp-servers/${dir.name}/`,
            version: metadata.version,
            registry: metadata.registry,
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
    table(
      ["Name", "Type", "Version", "Path"],
      items.map((item) => [
        item.name,
        item.type,
        item.version ?? "-",
        item.path,
      ])
    );
  });

function readMetadata(dir: string): InstalledMetadata {
  const metadataPath = join(dir, ".intertool.json");
  if (!existsSync(metadataPath)) return {};

  try {
    const metadata = JSON.parse(
      readFileSync(metadataPath, "utf-8")
    ) as InstalledMetadata;
    return metadata;
  } catch {
    return {};
  }
}
