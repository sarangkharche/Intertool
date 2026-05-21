import { statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { getAbsoluteUrl } from "@/lib/seo";

type SitemapEntry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: Array<{
  path: string;
  sourceFile: string[];
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  {
    path: "/",
    sourceFile: ["(main)", "page.tsx"],
    changeFrequency: "monthly",
    priority: 1,
  },
  {
    path: "/brand",
    sourceFile: ["(main)", "brand", "page.tsx"],
    changeFrequency: "yearly",
    priority: 0.35,
  },
];

function lastModified(fullPath: string): Date | undefined {
  try {
    return statSync(fullPath).mtime;
  } catch {
    return undefined;
  }
}

function lastModifiedForApp(parts: string[]): Date | undefined {
  return lastModified(path.join(process.cwd(), "app", ...parts));
}

function lastModifiedForDoc(filePath: string): Date | undefined {
  const relativePath = filePath.startsWith("content/docs/")
    ? filePath.slice("content/docs/".length)
    : filePath;
  const fullPath = path.join(process.cwd(), "content", "docs", relativePath);
  const relativeFromDocs = path.relative(
    path.join(process.cwd(), "content", "docs"),
    fullPath
  );
  if (relativeFromDocs.startsWith("..") || path.isAbsolute(relativeFromDocs)) {
    return undefined;
  }

  return lastModified(fullPath);
}

function docSourcePath(page: unknown): string | undefined {
  return (page as { file?: { path?: string } }).file?.path;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  function addEntry(entry: SitemapEntry) {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    entries.push(entry);
  }

  for (const route of STATIC_ROUTES) {
    addEntry({
      url: getAbsoluteUrl(route.path),
      lastModified: lastModifiedForApp(route.sourceFile),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  for (const page of source.getPages()) {
    const filePath = docSourcePath(page);
    addEntry({
      url: getAbsoluteUrl(page.url),
      lastModified: filePath ? lastModifiedForDoc(filePath) : undefined,
      changeFrequency: "monthly",
      priority: page.url === "/docs" ? 0.9 : 0.75,
    });
  }

  return entries;
}
