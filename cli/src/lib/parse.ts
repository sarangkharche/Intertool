import { parse as parseYaml } from "yaml";

interface SkillFrontmatter {
  slug?: string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  tags?: string[];
  compatibility?: string[];
  readme?: string;
}

export function parseSkillMd(content: string): SkillFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return parseYaml(match[1]) ?? {};
  } catch {
    return {};
  }
}

export function parseSkillYaml(content: string): SkillFrontmatter {
  try {
    return parseYaml(content) ?? {};
  } catch {
    return {};
  }
}

interface ServerJson {
  name?: string;
  description?: string;
  transport?: string;
  config?: Record<string, unknown>;
}

export function parseServerJson(content: string): ServerJson {
  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      description:
        typeof data.description === "string" ? data.description : undefined,
      transport:
        typeof data.transport === "string"
          ? data.transport
          : typeof data.transport === "object" &&
              data.transport !== null &&
              "type" in data.transport
            ? String((data.transport as { type?: unknown }).type)
            : undefined,
      config: data,
    };
  } catch {
    return {};
  }
}
