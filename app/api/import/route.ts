import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseSkillMd, parseServerJson } from "@/lib/registry";
import type { SkillType, McpTransport, SourceFormat } from "@/lib/types";

interface ImportResult {
  name: string;
  slug: string;
  type: SkillType;
  description: string;
  readme: string;
  tags: string[];
  compatibility: string[];
  source_url: string;
  source_format: SourceFormat;
  transport?: McpTransport;
  author?: string;
}

/** Resolve a GitHub URL to raw content URLs to try */
function resolveGitHubPaths(url: string): { owner: string; repo: string; paths: string[] } | null {
  // Match github.com/owner/repo patterns
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  // Prioritized list of files to look for
  return {
    owner,
    repo,
    paths: [
      "SKILL.md",
      "skill.yaml",
      "server.json",
      ".claude/skills/SKILL.md",
      "src/SKILL.md",
      "README.md",
    ],
  };
}

async function fetchRawFile(owner: string, repo: string, filePath: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      // Try default branch as 'master'
      const res2 = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${filePath}`,
        { next: { revalidate: 0 } }
      );
      if (!res2.ok) return null;
      return res2.text();
    }
    return res.text();
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let reqBody: { url: string };
  try {
    reqBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { url } = reqBody;
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const resolved = resolveGitHubPaths(url);
  if (!resolved) {
    return NextResponse.json(
      { error: "Invalid GitHub URL. Expected format: https://github.com/owner/repo" },
      { status: 400 }
    );
  }

  const { owner, repo, paths } = resolved;
  const sourceUrl = `https://github.com/${owner}/${repo}`;

  for (const filePath of paths) {
    const content = await fetchRawFile(owner, repo, filePath);
    if (!content) continue;

    const fileName = filePath.split("/").pop() ?? "";

    // Try SKILL.md
    if (fileName === "SKILL.md" || fileName.endsWith(".md")) {
      const parsed = parseSkillMd(content);
      if (parsed) {
        const fm = parsed.frontmatter;
        const result: ImportResult = {
          name: (fm.name as string) ?? repo,
          slug: slugify((fm.name as string) ?? repo),
          type: ((fm.type as string) ?? "skill") as SkillType,
          description: (fm.description as string) ?? "",
          readme: parsed.body,
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          compatibility: Array.isArray(fm.compatibility) ? fm.compatibility : [],
          source_url: sourceUrl,
          source_format: "skill-md",
          author: (fm.author as string) ?? owner,
        };
        return NextResponse.json(result);
      }
    }

    // Try skill.yaml
    if (fileName === "skill.yaml") {
      try {
        const { default: yamlPkg } = await import("yaml");
        const data = yamlPkg.parse(content) as Record<string, unknown>;
        if (data.name) {
          const result: ImportResult = {
            name: data.name as string,
            slug: slugify((data.slug as string) ?? (data.name as string)),
            type: ((data.type as string) ?? "skill") as SkillType,
            description: (data.description as string) ?? "",
            readme: "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            compatibility: Array.isArray(data.compatibility) ? data.compatibility : [],
            source_url: sourceUrl,
            source_format: "skill-yaml",
            author: (data.author as string) ?? owner,
          };
          return NextResponse.json(result);
        }
      } catch {
        // Not valid YAML, continue
      }
    }

    // Try server.json
    if (fileName === "server.json") {
      const parsed = parseServerJson(content);
      if (parsed) {
        const result: ImportResult = {
          name: parsed.name,
          slug: slugify(parsed.name),
          type: "mcp-server",
          description: parsed.description,
          readme: "",
          tags: [],
          compatibility: ["Claude Code", "Cursor"],
          source_url: sourceUrl,
          source_format: "server-json",
          transport: parsed.transport,
          author: owner,
        };
        return NextResponse.json(result);
      }
    }
  }

  return NextResponse.json(
    { error: "No SKILL.md, skill.yaml, or server.json found in repository" },
    { status: 404 }
  );
}
