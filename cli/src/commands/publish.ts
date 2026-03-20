import { Command } from "commander";
import { readFileSync } from "fs";
import { getConfig } from "../lib/config.js";
import { apiPostForm } from "../lib/api.js";
import { parseSkillMd, parseServerJson } from "../lib/parse.js";
import { bold, dim, cyan, check, cross, isJsonMode, spinner } from "../lib/format.js";

export const publishCommand = new Command("publish")
  .description("Publish a skill to the registry")
  .argument("<file>", "Path to SKILL.md, skill.yaml, or server.json")
  .option("--name <name>", "Skill name")
  .option("--type <type>", "Type: skill, mcp-server, agent-tool, prompt-template")
  .option("--description <desc>", "Short description")
  .option("--category <cat>", "Category slug")
  .option("--tags <tags>", "Comma-separated tags", "")
  .option("--source-url <url>", "Source repository URL")
  .addHelpText("after", `
Examples:
  $ intertool publish SKILL.md
  $ intertool publish SKILL.md --name "My Skill" --type skill --category dev-tools
  $ intertool publish server.json --type mcp-server --category integrations
`)
  .action(async (filePath, opts) => {
    const config = getConfig();
    if (!config.token) {
      console.error(cross("Not logged in. Run: intertool login --url <url>"));
      process.exit(1);
    }

    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      console.error(cross(`File not found: ${filePath}`));
      process.exit(1);
    }

    // Auto-detect from frontmatter or JSON
    let detected: { name?: string; description?: string; type?: string; category?: string; tags?: string[] } = {};
    if (filePath.endsWith(".json")) {
      const parsed = parseServerJson(content);
      detected = { name: parsed.name, description: parsed.description, type: "mcp-server" };
    } else {
      detected = parseSkillMd(content);
    }

    // Flags override auto-detected values
    const name = opts.name ?? detected.name;
    const type = opts.type ?? detected.type;
    const description = opts.description ?? detected.description;
    const category = opts.category ?? detected.category;
    const tags = opts.tags
      ? opts.tags.split(",").map((t: string) => t.trim())
      : detected.tags ?? [];

    // Validate required fields
    const missing: string[] = [];
    if (!name) missing.push("--name");
    if (!type) missing.push("--type");
    if (!description) missing.push("--description");
    if (!category) missing.push("--category");
    if (missing.length > 0) {
      console.error(cross(`Missing required fields: ${missing.join(", ")}`));
      console.error(dim("Provide them as flags, or add frontmatter to your SKILL.md:"));
      console.error(dim("  ---"));
      console.error(dim("  name: My Skill"));
      console.error(dim("  type: skill"));
      console.error(dim("  description: What it does"));
      console.error(dim("  category: dev-tools"));
      console.error(dim("  ---"));
      process.exit(1);
    }

    const slug = name!
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const formData = new FormData();
    formData.append("name", name!);
    formData.append("slug", slug);
    formData.append("type", type!);
    formData.append("description", description!);
    formData.append("category", category!);
    formData.append("tags", JSON.stringify(tags));
    formData.append("compatibility", JSON.stringify([]));
    formData.append("readme", content);
    if (opts.sourceUrl) {
      formData.append("source_url", opts.sourceUrl);
    }

    const s = spinner(`Publishing ${name}...`);

    try {
      const result = (await apiPostForm(`/api/publish`, formData)) as { slug: string };
      s.stop();

      if (isJsonMode()) {
        console.log(JSON.stringify({ published: true, slug: result.slug, url: `${config.apiUrl}/skills/${result.slug}` }));
      } else {
        console.log(check(`${bold(name!)} published`));
        console.log(dim(`  ${cyan(`${config.apiUrl}/skills/${result.slug}`)}`));
      }
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Publish failed")
      );
      process.exit(1);
    }
  });
