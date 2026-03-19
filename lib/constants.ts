import { SkillType } from "./types";

export const SKILL_TYPE_LABELS: Record<SkillType, string> = {
  skill: "Skill",
  "mcp-server": "MCP Server",
  "agent-tool": "Agents",
  "prompt-template": "Prompt Template",
};

export const SKILL_TYPE_COLORS: Record<SkillType, string> = {
  skill: "bg-violet-500/8 text-violet-700 dark:text-violet-400 border-violet-500/15",
  "mcp-server": "bg-blue-500/8 text-blue-700 dark:text-blue-400 border-blue-500/15",
  "agent-tool": "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-500/15",
  "prompt-template": "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-500/15",
};


export const PER_PAGE = 20;

export const GITHUB_URL = "https://github.com/sarangkharche/intertool";
