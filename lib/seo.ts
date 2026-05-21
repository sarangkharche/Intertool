import type { Metadata } from "next";
import { GITHUB_URL } from "@/lib/constants";

export const SITE_NAME = "Intertool";
export const SITE_TITLE = "Intertool - Private AI Agent Registry";
export const SITE_DESCRIPTION =
  "A self-hosted registry for AI agent skills, MCP servers, agent tools, and prompt templates with S3 storage, OAuth, RBAC, CLI install flows, and LLM-ready documentation.";

export const SEO_KEYWORDS = [
  "AI agent registry",
  "agent skills",
  "MCP server registry",
  "prompt template registry",
  "Claude Code skills",
  "Cursor tools",
  "self-hosted AI tools",
  "private AI registry",
  "Intertool CLI",
];

const DEFAULT_LOCAL_URL = "http://localhost:3000";

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_LOCAL_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getSiteUrl(): URL {
  const explicitUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.AUTH_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const domain = process.env.INTERTOOL_DOMAIN;

  return new URL(
    normalizeOrigin(
      explicitUrl ||
        (vercelUrl ? `https://${vercelUrl}` : "") ||
        (domain ? `https://${domain}` : "") ||
        DEFAULT_LOCAL_URL
    )
  );
}

export function getAbsoluteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}

type OpenGraphImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export function getOpenGraphImage(): OpenGraphImage {
  return {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Intertool private AI agent registry",
  };
}

export function getPublicPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
}: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      images: [getOpenGraphImage()],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export function getPrivatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export function buildHomeJsonLd() {
  const siteUrl = getAbsoluteUrl("/");
  const docsUrl = getAbsoluteUrl("/docs");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: SITE_NAME,
        url: siteUrl,
        sameAs: [GITHUB_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        publisher: {
          "@id": `${siteUrl}#organization`,
        },
        inLanguage: "en",
        hasPart: [
          {
            "@type": "WebPage",
            name: "Intertool Documentation",
            url: docsUrl,
          },
          {
            "@type": "DigitalDocument",
            name: "LLM documentation index",
            url: getAbsoluteUrl("/llms.txt"),
            encodingFormat: "text/plain",
          },
          {
            "@type": "DigitalDocument",
            name: "Full LLM documentation corpus",
            url: getAbsoluteUrl("/llms-full.txt"),
            encodingFormat: "text/plain",
          },
        ],
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}#application`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web browser",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: "USD",
        },
        codeRepository: GITHUB_URL,
        featureList: [
          "Private registry for AI agent skills",
          "MCP server and prompt template catalog",
          "CLI install and publishing workflows",
          "S3-compatible storage",
          "OAuth and role-based access control",
          "LLM-readable documentation endpoints",
        ],
        publisher: {
          "@id": `${siteUrl}#organization`,
        },
      },
    ],
  };
}

export function buildDocsJsonLd({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description?: string;
}) {
  const url = getAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: title,
        description,
        url,
        inLanguage: "en",
        isPartOf: {
          "@type": "CreativeWorkSeries",
          "@id": `${getAbsoluteUrl("/docs")}#documentation`,
          name: "Intertool Documentation",
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: getAbsoluteUrl("/"),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: getAbsoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Docs",
            item: getAbsoluteUrl("/docs"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: url,
          },
        ],
      },
    ],
  };
}
