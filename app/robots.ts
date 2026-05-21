import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/docs/",
          "/brand",
          "/pricing",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/browse",
          "/create-org",
          "/dashboard",
          "/design-system",
          "/invite",
          "/publish",
          "/review",
          "/search",
          "/settings",
          "/sign-in",
          "/skills",
          "/teams",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getSiteUrl().origin,
  };
}
