import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { getConfig } from "../lib/config.js";
import { apiPostForm } from "../lib/api.js";
import { parseSkillMd, parseSkillYaml, parseServerJson } from "../lib/parse.js";
import {
  bold,
  dim,
  cyan,
  check,
  cross,
  isJsonMode,
  spinner,
} from "../lib/format.js";

export const publishCommand = new Command("publish")
  .description("Publish a skill to the registry")
  .argument("<file>", "Path to SKILL.md, skill.yaml, or server.json")
  .option("--name <name>", "Skill name")
  .option(
    "--type <type>",
    "Type: skill, mcp-server, agent-tool, prompt-template"
  )
  .option("--description <desc>", "Short description")
  .option("--category <cat>", "Category slug")
  .option("--tags <tags>", "Comma-separated tags", "")
  .option("--source-url <url>", "Source repository URL")
  .addHelpText(
    "after",
    `
Examples:
  $ intertool publish SKILL.md
  $ intertool publish SKILL.md --name "My Skill" --type skill --category dev-tools
  $ intertool publish server.json --type mcp-server --category integrations
`
  )
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
    let detected: {
      slug?: string;
      name?: string;
      description?: string;
      type?: string;
      category?: string;
      tags?: string[];
      compatibility?: string[];
      readme?: string;
      transport?: string;
      mcpConfig?: Record<string, unknown>;
    } = {};
    if (filePath.endsWith(".json")) {
      const parsed = parseServerJson(content);
      const sidecar = readMetadataSidecar(filePath);
      detected = {
        ...sidecar,
        name: parsed.name ?? sidecar.name,
        description: parsed.description ?? sidecar.description,
        type: "mcp-server",
        transport: parsed.transport,
        mcpConfig: parsed.config,
        readme: sidecar.readme ?? readAdjacentReadme(filePath),
      };
    } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      detected = parseSkillYaml(content);
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
      : (detected.tags ?? []);
    const compatibility = detected.compatibility ?? [];

    // Validate required fields
    const missing: string[] = [];
    if (!name) missing.push("--name");
    if (!type) missing.push("--type");
    if (!description) missing.push("--description");
    if (!category) missing.push("--category");
    if (missing.length > 0) {
      console.error(cross(`Missing required fields: ${missing.join(", ")}`));
      console.error(
        dim("Provide them as flags, or add frontmatter to your SKILL.md:")
      );
      console.error(dim("  ---"));
      console.error(dim("  name: My Skill"));
      console.error(dim("  type: skill"));
      console.error(dim("  description: What it does"));
      console.error(dim("  category: dev-tools"));
      console.error(dim("  ---"));
      process.exit(1);
    }

    const slug =
      detected.slug ??
      name!
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
    formData.append("compatibility", JSON.stringify(compatibility));
    const readme =
      typeof detected.readme === "string" ? detected.readme : content;
    formData.append("readme", readme);
    if (opts.sourceUrl) {
      formData.append("source_url", opts.sourceUrl);
    }
    if (detected.transport) {
      formData.append("transport", detected.transport);
    }
    if (detected.mcpConfig) {
      formData.append("source_format", "server-json");
      formData.append("mcp_config", JSON.stringify(detected.mcpConfig));
    } else if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      formData.append("source_format", "skill-yaml");
    } else if (filePath.endsWith(".md")) {
      formData.append("source_format", "skill-md");
    }

    const s = spinner(`Publishing ${name}...`);

    try {
      const result = (await apiPostForm(`/api/publish`, formData)) as {
        slug: string;
        status?: string;
        message?: string;
      };
      s.stop();

      const status = result.status ?? "published";
      const published = status === "published";
      const submittedForReview = status === "review";
      const url = `${config.apiUrl}/skills/${result.slug}`;

      if (isJsonMode()) {
        console.log(
          JSON.stringify({
            ok: true,
            published,
            submitted_for_review: submittedForReview,
            status,
            slug: result.slug,
            url,
            message:
              result.message ??
              (submittedForReview
                ? "Skill submitted for review"
                : "Skill published"),
          })
        );
      } else {
        console.log(
          check(
            submittedForReview
              ? `${bold(name!)} submitted for review`
              : `${bold(name!)} published`
          )
        );
        console.log(dim(`  ${cyan(url)}`));
        if (submittedForReview) {
          console.log(
            dim("  It will be installable after owner/admin approval.")
          );
        }
      }
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Publish failed")
      );
      process.exit(1);
    }
  });

function readMetadataSidecar(filePath: string) {
  const dir = dirname(filePath);
  const candidates = [
    "intertool.yaml",
    "intertool.yml",
    "skill.yaml",
    "skill.yml",
  ];

  for (const name of candidates) {
    const sidecarPath = join(dir, name);
    if (!existsSync(sidecarPath)) continue;
    try {
      return parseSkillYaml(readFileSync(sidecarPath, "utf-8"));
    } catch {
      return {};
    }
  }

  return {};
}

function readAdjacentReadme(filePath: string): string | undefined {
  const dir = dirname(filePath);
  const candidates = ["README.md", "README.mdx", "readme.md"];

  for (const name of candidates) {
    const readmePath = join(dir, name);
    if (!existsSync(readmePath)) continue;
    try {
      return readFileSync(readmePath, "utf-8");
    } catch {
      return undefined;
    }
  }

  return undefined;
}
