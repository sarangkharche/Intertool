import { Command } from "commander";
import { readFileSync } from "fs";
import { getConfig } from "../lib/config.js";

export const publishCommand = new Command("publish")
  .description("Publish a skill to the registry")
  .argument("<file>", "Path to SKILL.md, skill.yaml, or server.json")
  .requiredOption("--name <name>", "Skill name")
  .requiredOption("--type <type>", "Type: skill, mcp-server, agent-tool, prompt-template")
  .requiredOption("--description <desc>", "Short description")
  .requiredOption("--category <cat>", "Category slug")
  .option("--tags <tags>", "Comma-separated tags", "")
  .option("--source-url <url>", "Source repository URL")
  .action(async (filePath, opts) => {
    const config = getConfig();
    if (!config.token) {
      console.error("Not logged in. Run: intertool login --token <token>");
      process.exit(1);
    }

    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const slug = opts.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const formData = new FormData();
    formData.append("name", opts.name);
    formData.append("slug", slug);
    formData.append("type", opts.type);
    formData.append("description", opts.description);
    formData.append("category", opts.category);
    formData.append("tags", JSON.stringify(opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : []));
    formData.append("compatibility", JSON.stringify([]));
    formData.append("readme", content);
    if (opts.sourceUrl) {
      formData.append("source_url", opts.sourceUrl);
    }

    try {
      console.log(`Publishing ${opts.name}...`);

      const res = await fetch(`${config.apiUrl}/api/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || `HTTP ${res.status}`
        );
      }

      const result = (await res.json()) as { slug: string };
      console.log(`Published! View at: ${config.apiUrl}/skills/${result.slug}`);
    } catch (err) {
      console.error(
        "Publish failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });
