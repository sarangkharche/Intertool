import type { RegistrySettings } from "./settings";
import type { Skill } from "./types";

export function orgApiPath(orgSlug: string | undefined, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return orgSlug ? `/${orgSlug}${cleanPath}` : cleanPath;
}

export function publicRegistryUrl(
  origin: string,
  orgSlug: string | undefined,
  path: string
): string {
  return `${origin}${orgApiPath(orgSlug, path)}`;
}

export function mcpRegistryServer(
  skill: Skill,
  settings: RegistrySettings | null,
  origin: string,
  orgSlug?: string
) {
  const registryName = settings?.org_slug ?? orgSlug ?? "intertool";
  const version = skill.version ?? "1.0.0";
  const remoteUrl =
    skill.transport === "sse" || skill.transport === "streamable-http"
      ? skill.source_url
      : undefined;

  return {
    server: {
      name: `${registryName}/${skill.slug}`,
      version,
      description: skill.description,
      ...(skill.source_url ? { repository: { url: skill.source_url } } : {}),
      ...(remoteUrl
        ? {
            remotes: [
              {
                type: skill.transport,
                url: remoteUrl,
              },
            ],
          }
        : {
            packages: [
              {
                registry: "npm",
                name: `@${skill.author}/${skill.slug}`,
                version,
              },
            ],
          }),
      _meta: {
        "io.intertool/registry": {
          slug: skill.slug,
          author: skill.author,
          category: skill.category_slug,
          security: skill.security?.status ?? "unknown",
          detailUrl: publicRegistryUrl(
            origin,
            orgSlug,
            `/api/skills/${skill.slug}`
          ),
        },
      },
    },
    _meta: {
      status: "active",
      publishedAt: skill.created_at,
      updatedAt: skill.updated_at ?? skill.created_at,
      isLatest: true,
    },
  };
}

function githubSource(sourceUrl: string):
  | {
      source: "github";
      repo: string;
      ref?: string;
    }
  | null {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== "github.com") return null;
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return {
      source: "github",
      repo: `${owner}/${repo.replace(/\.git$/, "")}`,
    };
  } catch {
    return null;
  }
}

export function claudeMarketplace(
  skills: Skill[],
  settings: RegistrySettings | null,
  origin: string,
  orgSlug?: string
) {
  const name = `${settings?.org_slug ?? orgSlug ?? "intertool"}-tools`;
  return {
    name,
    owner: {
      name: settings?.org_name ?? "Intertool Registry",
      ...(settings?.admin_email ? { email: settings.admin_email } : {}),
    },
    description: "Approved Claude Code plugins and skills from Intertool.",
    version: "1.0.0",
    plugins: skills
      .filter((skill) => skill.source_url || skill.type === "skill")
      .map((skill) => ({
        name: skill.slug,
        source:
          (skill.source_url ? githubSource(skill.source_url) : null) ??
          publicRegistryUrl(origin, orgSlug, `/api/skills/${skill.slug}/raw`),
        description: skill.description,
        version: skill.version ?? "1.0.0",
        author: {
          name: skill.author,
        },
        metadata: {
          intertoolType: skill.type,
          intertoolSecurity: skill.security?.status ?? "unknown",
        },
      })),
  };
}
