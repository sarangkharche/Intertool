import { hasPermission } from "./rbac";
import type { OrgRole, Skill } from "./types";

export function canViewRegistryItem(
  skill: Skill,
  user: { username: string; role: OrgRole | null }
): boolean {
  if (skill.status === "published") return true;
  if (skill.author.toLowerCase() === user.username.toLowerCase()) return true;
  return user.role ? hasPermission(user.role, "skill:edit_any") : false;
}
