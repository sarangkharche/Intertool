import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs/", "/brand", "/llms.txt", "/llms-full.txt"],
        disallow: [
          "/api/",
          "/admin",
          "/browse",
          "/create-org",
          "/dashboard",
          "/design-system",
          "/memories",
          "/onboarding",
          "/repositories",
          "/settings",
          "/sign-in",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getSiteUrl().origin,
  };
}
