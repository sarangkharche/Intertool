export type SkillType = "skill" | "mcp-server" | "agent-tool" | "prompt-template";
export type SkillStatus = "draft" | "review" | "published" | "archived";
export type SourceFormat = "skill-yaml" | "skill-md" | "server-json" | "zip";
export type McpTransport = "stdio" | "sse" | "streamable-http";

export interface Skill {
  slug: string;
  name: string;
  type: SkillType;
  description: string;
  readme: string;
  author: string;
  category_slug: string;
  tags: string[];
  compatibility: string[];
  install_command: string;
  install_commands?: Record<string, string>;
  source_url?: string;
  source_format?: SourceFormat;
  transport?: McpTransport;
  status: SkillStatus;
  version?: string;
  updated_at?: string;
  created_at: string;
}

export interface SkillVersion {
  version: string;
  changelog: string;
  author: string;
  created_at: string;
  readme?: string;
  snapshot?: Skill;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface SearchFilters {
  query?: string;
  type?: SkillType;
  category?: string;
  author?: string;
  sort?: "newest" | "name";
  page?: number;
  limit?: number;
}
