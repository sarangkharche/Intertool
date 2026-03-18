import { SkillType } from "./types";

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  skill: "Skill",
  "mcp-server": "MCP Server",
  "agent-tool": "Agent Tool",
  "prompt-template": "Prompt Template",
};

export const SKILL_TYPE_COLORS: Record<SkillType, string> = {
  skill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  "mcp-server": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  "agent-tool": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  "prompt-template": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
};


export const PER_PAGE = 20;

export const GITHUB_URL = "https://github.com/sarangkharche/intertool";
