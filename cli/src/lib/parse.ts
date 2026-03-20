import { parse as parseYaml } from "yaml";

interface SkillFrontmatter {
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  tags?: string[];
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

interface ServerJson {
  name?: string;
  description?: string;
  transport?: string;
}

export function parseServerJson(content: string): ServerJson {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}
