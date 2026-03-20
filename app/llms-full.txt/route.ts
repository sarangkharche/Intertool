import { readFileSync } from "fs";
import { join } from "path";
import { source } from "@/lib/source";

export const revalidate = 3600;

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
        const fullPath = join(process.cwd(), filePath);
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
