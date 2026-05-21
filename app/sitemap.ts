import { statSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { getAbsoluteUrl } from "@/lib/seo";

type SitemapEntry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: Array<{
  path: string;
  sourceFile: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  {
    path: "/",
    sourceFile: "app/(main)/page.tsx",
    changeFrequency: "monthly",
    priority: 1,
  },
  {
    path: "/brand",
    sourceFile: "app/(main)/brand/page.tsx",
    changeFrequency: "yearly",
    priority: 0.35,
  },
];

function lastModifiedFor(relativePath: string): Date | undefined {
  const fullPath = path.join(process.cwd(), relativePath);
  const relativeFromRoot = path.relative(process.cwd(), fullPath);
  if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
    return undefined;
  }

  try {
    return statSync(fullPath).mtime;
  } catch {
    return undefined;
  }
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
      lastModified: lastModifiedFor(route.sourceFile),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  for (const page of source.getPages()) {
    const filePath = docSourcePath(page);
    addEntry({
      url: getAbsoluteUrl(page.url),
      lastModified: filePath ? lastModifiedFor(filePath) : undefined,
      changeFrequency: "monthly",
      priority: page.url === "/docs" ? 0.9 : 0.75,
    });
  }

  return entries;
}
