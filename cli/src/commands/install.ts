import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { getConfig } from "../lib/config.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { bold, dim, check, cross, isJsonMode, spinner } from "../lib/format.js";

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
  .addHelpText("after", `
Examples:
  $ intertool install @team/code-review
  $ intertool install my-skill --json
`)
  .action(async (name: string) => {
    const slug = name.replace(/^@[^/]+\//, "");
    const config = getConfig();

    if (!config.token) {
      console.error(cross("Not logged in. Run: intertool login --url <url>"));
      process.exit(1);
    }

    const s = spinner(`Fetching ${name}...`);

    try {
      const skill = (await apiGet(`/api/skills/${slug}`)) as Skill;
      s.stop();

      switch (skill.type) {
        case "skill":
        case "prompt-template":
        case "agent-tool": {
          const skillDir = join(process.cwd(), ".claude", "skills", slug);
          mkdirSync(skillDir, { recursive: true });
          writeFileSync(join(skillDir, "SKILL.md"), skill.readme);
          ensureGitignore();

          if (isJsonMode()) {
            console.log(JSON.stringify({ installed: true, path: `.claude/skills/${slug}/SKILL.md`, skill: { slug: skill.slug, name: skill.name, type: skill.type } }));
          } else {
            console.log(check(`${bold(skill.name)} installed`));
            console.log(dim(`  ${skill.description}`));
            console.log(dim(`  .claude/skills/${slug}/SKILL.md`));
          }
          break;
        }

        case "mcp-server": {
          const cmds = skill.install_commands ?? {};
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
          ensureGitignore();

          if (isJsonMode()) {
            console.log(JSON.stringify({ installed: true, path: `.claude/mcp-servers/${slug}/server.json`, skill: { slug: skill.slug, name: skill.name, type: skill.type }, install_commands: cmds }));
          } else {
            console.log(check(`${bold(skill.name)} saved`));
            console.log(dim(`  .claude/mcp-servers/${slug}/server.json\n`));
            for (const [platform, cmd] of Object.entries(cmds)) {
              console.log(`  ${dim(platform + ":")}  $ ${cmd}`);
            }
          }
          break;
        }

        default:
          console.error(cross(`Unknown type: ${skill.type}`));
          process.exit(1);
      }
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Install failed")
      );
      process.exit(1);
    }
  });

/** Add .claude/skills/ and .claude/mcp-servers/ to .gitignore if not present */
function ensureGitignore() {
  const gitignorePath = join(process.cwd(), ".gitignore");
  const entries = [".claude/skills/", ".claude/mcp-servers/"];

  try {
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, "utf-8");
      const missing = entries.filter((e) => !content.includes(e));
      if (missing.length === 0) return;
      writeFileSync(
        gitignorePath,
        content.trimEnd() + `\n\n# Intertool (org-internal)\n${missing.join("\n")}\n`
      );
    } else {
      writeFileSync(
        gitignorePath,
        `# Intertool (org-internal)\n${entries.join("\n")}\n`
      );
    }
  } catch {
    // Non-fatal
  }
}
