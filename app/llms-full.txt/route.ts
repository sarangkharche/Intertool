import { readFileSync } from "node:fs";
import path from "node:path";
import { source } from "@/lib/source";

export const revalidate = 3600;

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");

function resolveDocPath(filePath: string): string | null {
  const relativePath = filePath.startsWith("content/docs/")
    ? filePath.slice("content/docs/".length)
    : filePath;
  const fullPath = path.join(DOCS_ROOT, relativePath);
  const relativeFromRoot = path.relative(DOCS_ROOT, fullPath);

  if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
    return null;
  }

  return fullPath;
}

export function GET() {
  const pages = source.getPages();
  const sections: string[] = [
    "# Intertool Documentation (Full)",
    "",
    "> Complete documentation for LLM consumption.",
    "",
  ];

  for (const page of pages) {
    const title = page.data.title;
    const desc = page.data.description ?? "";
    const filePath = (page as any).file?.path; // eslint-disable-line @typescript-eslint/no-explicit-any

    sections.push(`## ${title}`);
    if (desc) sections.push(`> ${desc}`);
    sections.push("");

    if (filePath) {
      try {
        const fullPath = resolveDocPath(filePath);
        if (!fullPath) throw new Error("Invalid documentation path");
        let content = readFileSync(fullPath, "utf-8");
        // Strip frontmatter
        content = content.replace(/^---[\s\S]*?---\n*/, "");
        sections.push(content.trim());
      } catch {
        sections.push("*Content unavailable.*");
      }
    }

    sections.push("");
    sections.push("---");
    sections.push("");
  }

  return new Response(sections.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
