import { Command } from "commander";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { apiGet } from "../lib/api.js";
import { check, cross, dim, isJsonMode, spinner } from "../lib/format.js";
import { installItem } from "./install.js";

interface InstalledMetadata {
  slug: string;
  name: string;
  type: "skill" | "mcp-server" | "agent-tool" | "prompt-template";
  version?: string;
}

interface RemoteSkill {
  slug: string;
  name: string;
  type: string;
  version?: string;
}

interface UpdateResult {
  slug: string;
  name: string;
  previous_version?: string;
  current_version?: string;
  updated: boolean;
}

export const updateCommand = new Command("update")
  .description("Update installed skills to latest versions")
  .argument("[name]", "Installed skill name, or omit to update all")
  .addHelpText(
    "after",
    `
Examples:
  $ intertool update
  $ intertool update @team/code-review
`
  )
  .action(async (name?: string) => {
    const s = spinner(
      name ? `Checking ${name}...` : "Checking installed items..."
    );

    try {
      const results = name
        ? [await updateOne(name.replace(/^@[^/]+\//, ""))]
        : await updateAll();
      s.stop();
      printResults(results);
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Update failed")
      );
      process.exit(1);
    }
  });

async function updateAll(): Promise<UpdateResult[]> {
  const installed = findInstalledItems();
  if (installed.length === 0) return [];

  const results: UpdateResult[] = [];
  for (const item of installed) {
    results.push(await updateInstalled(item));
  }
  return results;
}

async function updateOne(slug: string): Promise<UpdateResult> {
  const installed = findInstalledItems().find((item) => item.slug === slug);
  if (!installed) {
    throw new Error(`${slug} is not installed in this project`);
  }
  return updateInstalled(installed);
}

async function updateInstalled(
  installed: InstalledMetadata
): Promise<UpdateResult> {
  const remote = (await apiGet(`/api/skills/${installed.slug}`)) as RemoteSkill;
  const needsUpdate =
    !installed.version ||
    !remote.version ||
    installed.version !== remote.version ||
    installed.type !== remote.type;

  if (needsUpdate) {
    await installItem(installed.slug);
  }

  return {
    slug: remote.slug,
    name: remote.name,
    previous_version: installed.version,
    current_version: remote.version,
    updated: needsUpdate,
  };
}

function findInstalledItems(): InstalledMetadata[] {
  return [
    ...readInstalledFrom(".claude/skills"),
    ...readInstalledFrom(".claude/mcp-servers"),
  ];
}

function readInstalledFrom(basePath: string): InstalledMetadata[] {
  const dir = join(process.cwd(), basePath);
  if (!existsSync(dir)) return [];

  const items: InstalledMetadata[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metadataPath = join(dir, entry.name, ".intertool.json");
    if (!existsSync(metadataPath)) continue;
    try {
      const metadata = JSON.parse(
        readFileSync(metadataPath, "utf-8")
      ) as InstalledMetadata;
      if (metadata.slug && metadata.type) items.push(metadata);
    } catch {
      // Ignore corrupt metadata and keep updating other installed items.
    }
  }
  return items;
}

function printResults(results: UpdateResult[]): void {
  if (isJsonMode()) {
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(dim("No Intertool-installed skills found in this project."));
    return;
  }

  for (const result of results) {
    const versionText =
      result.previous_version && result.current_version
        ? ` ${dim(`${result.previous_version} -> ${result.current_version}`)}`
        : "";
    if (result.updated) {
      console.log(check(`${result.name} updated${versionText}`));
    } else {
      console.log(dim(`${result.name} is already current${versionText}`));
    }
  }
}
