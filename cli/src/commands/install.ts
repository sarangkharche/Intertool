import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { getConfig } from "../lib/config.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface Skill {
  slug: string;
  name: string;
  type: string;
  author: string;
  description: string;
  readme: string;
  install_commands: Record<string, string>;
  transport?: string;
}

export const installCommand = new Command("install")
  .description("Install a skill, MCP server, agent tool, or prompt template")
  .argument("<name>", "Skill name (e.g., @team/skill-name)")
  .action(async (name: string) => {
    const slug = name.replace(/^@[^/]+\//, "");
    const config = getConfig();

    if (!config.token) {
      console.error("Not logged in. Run: npx intertool login --url <url>");
      process.exit(1);
    }

    try {
      console.log(`Fetching ${name}...`);
      const skill = (await apiGet(`/api/skills/${slug}`)) as Skill;

      console.log(`${skill.name} (${skill.type})\n`);

      switch (skill.type) {
        case "skill":
        case "prompt-template":
        case "agent-tool": {
          // All three are local content — write to .claude/skills/
          const skillDir = join(process.cwd(), ".claude", "skills", slug);
          mkdirSync(skillDir, { recursive: true });
          writeFileSync(join(skillDir, "SKILL.md"), skill.readme);
          console.log(`Installed to .claude/skills/${slug}/SKILL.md`);
          console.log("Claude Code will pick it up automatically in this project.");

          // Add .claude/skills/ to .gitignore if not already there
          ensureGitignore();
          break;
        }

        case "mcp-server": {
          // MCP servers are external — show the install command
          const cmds = skill.install_commands ?? {};

          if (cmds["Claude Code"]) {
            console.log("Claude Code:");
            console.log(`  ${cmds["Claude Code"]}\n`);
          }
          if (cmds["Cursor"]) {
            console.log("Cursor:");
            console.log(`  ${cmds["Cursor"]}\n`);
          }

          // Also save the server.json for reference
          const mcpDir = join(process.cwd(), ".claude", "mcp-servers", slug);
          mkdirSync(mcpDir, { recursive: true });
          writeFileSync(
            join(mcpDir, "server.json"),
            JSON.stringify(
              {
                name: skill.name,
                description: skill.description,
                transport: skill.transport,
                install_commands: skill.install_commands,
              },
              null,
              2
            )
          );
          console.log(`Server info saved to .claude/mcp-servers/${slug}/server.json`);
          break;
        }

        default:
          console.error(`Unknown type: ${skill.type}`);
          process.exit(1);
      }
    } catch (err) {
      console.error(
        "Install failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

/** Add .claude/skills/ and .claude/mcp-servers/ to .gitignore if not present */
function ensureGitignore() {
  const gitignorePath = join(process.cwd(), ".gitignore");
  const entry = ".claude/skills/";

  try {
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, "utf-8");
      if (content.includes(entry)) return;
      writeFileSync(gitignorePath, content.trimEnd() + `\n\n# Intertool skills (org-internal)\n${entry}\n.claude/mcp-servers/\n`);
    } else {
      writeFileSync(gitignorePath, `# Intertool skills (org-internal)\n${entry}\n.claude/mcp-servers/\n`);
    }
    console.log("Added .claude/skills/ to .gitignore");
  } catch {
    // Non-fatal
  }
}
