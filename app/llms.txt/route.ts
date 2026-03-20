import { source } from "@/lib/source";

export const revalidate = 3600;

export function GET() {
  const pages = source.getPages();

  const lines = [
    "# Intertool Documentation",
    "",
    "> A private registry for AI agent skills, MCP servers, tools, and prompt templates.",
    "",
    "## Pages",
    "",
  ];

  for (const page of pages) {
    const url = page.url;
    const title = page.data.title;
    const desc = page.data.description ?? "";
    lines.push(`- [${title}](${url}): ${desc}`);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
