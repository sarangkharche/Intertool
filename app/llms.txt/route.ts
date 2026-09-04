import { source } from "@/lib/source";
import { getAbsoluteUrl, SITE_DESCRIPTION } from "@/lib/seo";

export const revalidate = 3600;

export function GET() {
  const pages = source.getPages();

  const lines = [
    "# Intertool Documentation",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Primary URLs",
    "",
    `- [Home](${getAbsoluteUrl("/")})`,
    `- [Documentation](${getAbsoluteUrl("/docs")})`,
    `- [Agent installer](${getAbsoluteUrl("/install")})`,
    `- [Full LLM corpus](${getAbsoluteUrl("/llms-full.txt")})`,
    "",
    "## Pages",
    "",
  ];

  for (const page of pages) {
    const url = getAbsoluteUrl(page.url);
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
