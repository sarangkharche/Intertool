import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { getConfig } from "../lib/config.js";
import { bold, dim, cyan, cross, isJsonMode, spinner } from "../lib/format.js";

interface SkillDetail {
  slug: string;
  name: string;
  type: string;
  author: string;
  description: string;
  category: string;
  tags: string[];
  install_commands: Record<string, string>;
  source_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const infoCommand = new Command("info")
  .description("Show details about a skill from the registry")
  .argument("<slug>", "Skill slug (e.g., my-skill)")
  .action(async (slug: string) => {
    const config = getConfig();
    if (!config.token) {
      console.error(cross("Not logged in. Run: intertool login --url <url>"));
      process.exit(1);
    }

    const s = spinner("Fetching...");

    try {
      const skill = (await apiGet(`/api/skills/${slug}`)) as SkillDetail;
      s.stop();

      if (isJsonMode()) {
        console.log(JSON.stringify(skill, null, 2));
        return;
      }

      console.log();
      console.log(`  ${bold(skill.name)} ${dim(`@${skill.author}/${skill.slug}`)}`);
      console.log(`  ${skill.description}`);
      console.log();
      console.log(`  ${dim("Type:")}        ${skill.type}`);
      console.log(`  ${dim("Category:")}    ${skill.category}`);
      if (skill.tags?.length) {
        console.log(`  ${dim("Tags:")}        ${skill.tags.join(", ")}`);
      }
      if (skill.source_url) {
        console.log(`  ${dim("Source:")}      ${skill.source_url}`);
      }
      console.log(`  ${dim("Registry:")}    ${cyan(`${config.apiUrl}/skills/${skill.slug}`)}`);

      const cmds = skill.install_commands ?? {};
      if (Object.keys(cmds).length > 0) {
        console.log();
        console.log(`  ${dim("Install:")}`);
        for (const [platform, cmd] of Object.entries(cmds)) {
          console.log(`    ${dim(platform + ":")}  ${cmd}`);
        }
      }
      console.log();
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : `Failed to fetch ${slug}`)
      );
      process.exit(1);
    }
  });
