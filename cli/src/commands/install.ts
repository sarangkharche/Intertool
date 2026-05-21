import { Command } from "commander";
import { apiDownload, apiGet } from "../lib/api.js";
import { getConfig } from "../lib/config.js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join, resolve, sep } from "path";
import { bold, dim, check, cross, isJsonMode, spinner } from "../lib/format.js";

interface SkillFile {
  path: string;
  size: number;
  content_type: string;
  sha256: string;
}

interface Skill {
  slug: string;
  name: string;
  type: string;
  author: string;
  description: string;
  readme: string;
  install_commands: Record<string, string>;
  transport?: string;
  version?: string;
  files?: SkillFile[];
}

interface InstallMetadata {
  slug: string;
  name: string;
  type: string;
  author: string;
  version?: string;
  registry: string;
  installed_at: string;
  files: SkillFile[];
}

export interface InstallResult {
  installed: true;
  path: string;
  metadataPath: string;
  downloadedFiles: string[];
  skill: {
    slug: string;
    name: string;
    type: string;
    version?: string;
  };
  install_commands?: Record<string, string>;
}

export const installCommand = new Command("install")
  .description("Install a skill, MCP server, agent tool, or prompt template")
  .argument("<name>", "Skill name (e.g., @team/skill-name)")
  .addHelpText(
    "after",
    `
Examples:
  $ intertool install @team/code-review
  $ intertool install my-skill --json
`
  )
  .action(async (name: string) => {
    const s = spinner(`Fetching ${name}...`);

    try {
      const result = await installItem(name);
      s.stop();
      printInstallResult(result);
    } catch (err) {
      s.stop();
      console.error(
        cross(err instanceof Error ? err.message : "Install failed")
      );
      process.exit(1);
    }
  });

export async function installItem(name: string): Promise<InstallResult> {
  const slug = name.replace(/^@[^/]+\//, "");
  const config = getConfig();

  if (!config.token) {
    throw new Error("Not logged in. Run: intertool login --url <url>");
  }

  const skill = (await apiGet(`/api/skills/${slug}`)) as Skill;
  const rootDir = installRoot(skill, slug);
  mkdirSync(rootDir, { recursive: true });

  switch (skill.type) {
    case "skill":
    case "prompt-template":
    case "agent-tool":
      writeFileSync(join(rootDir, "SKILL.md"), skill.readme);
      break;
    case "mcp-server":
      writeFileSync(
        join(rootDir, "server.json"),
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
      break;
    default:
      throw new Error(`Unknown type: ${skill.type}`);
  }

  const downloadedFiles = await downloadPackageFiles(skill, rootDir);
  const metadataPath = join(rootDir, ".intertool.json");
  const metadata: InstallMetadata = {
    slug: skill.slug,
    name: skill.name,
    type: skill.type,
    author: skill.author,
    version: skill.version,
    registry: config.apiUrl,
    installed_at: new Date().toISOString(),
    files: skill.files ?? [],
  };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
  ensureGitignore();

  return {
    installed: true,
    path: relativeInstallPath(skill.type, slug),
    metadataPath: `${relativeInstallPath(skill.type, slug)}/.intertool.json`,
    downloadedFiles,
    skill: {
      slug: skill.slug,
      name: skill.name,
      type: skill.type,
      version: skill.version,
    },
    install_commands:
      skill.type === "mcp-server" ? (skill.install_commands ?? {}) : undefined,
  };
}

function printInstallResult(result: InstallResult): void {
  if (isJsonMode()) {
    console.log(JSON.stringify(result));
    return;
  }

  console.log(check(`${bold(result.skill.name)} installed`));
  if (result.skill.version) {
    console.log(dim(`  Version: ${result.skill.version}`));
  }
  console.log(dim(`  ${result.path}`));
  if (result.downloadedFiles.length > 0) {
    console.log(dim(`  Package files: ${result.downloadedFiles.length}`));
  }

  for (const [platform, cmd] of Object.entries(result.install_commands ?? {})) {
    console.log(`  ${dim(platform + ":")}  $ ${cmd}`);
  }
}

function installRoot(skill: Skill, slug: string): string {
  return join(
    process.cwd(),
    skill.type === "mcp-server" ? ".claude/mcp-servers" : ".claude/skills",
    slug
  );
}

function relativeInstallPath(type: string, slug: string): string {
  return type === "mcp-server"
    ? `.claude/mcp-servers/${slug}`
    : `.claude/skills/${slug}`;
}

async function downloadPackageFiles(
  skill: Skill,
  rootDir: string
): Promise<string[]> {
  const downloaded: string[] = [];

  for (const file of skill.files ?? []) {
    const outputPath = resolveInside(rootDir, file.path);
    mkdirSync(dirname(outputPath), { recursive: true });
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
    const body = await apiDownload(
      `/api/skills/${skill.slug}/files/${encodedPath}`
    );
    writeFileSync(outputPath, Buffer.from(body));
    downloaded.push(file.path);
  }

  return downloaded;
}

function resolveInside(rootDir: string, relativePath: string): string {
  const root = resolve(rootDir);
  const target = resolve(root, relativePath);
  if (target !== root && target.startsWith(root + sep)) return target;
  throw new Error(
    `Refusing to write outside install directory: ${relativePath}`
  );
}

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
        content.trimEnd() +
          `\n\n# Intertool (org-internal)\n${missing.join("\n")}\n`
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
