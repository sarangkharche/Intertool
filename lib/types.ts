export type SkillType =
  | "skill"
  | "mcp-server"
  | "agent-tool"
  | "prompt-template";
export type SkillStatus = "draft" | "review" | "published" | "archived";
export type SourceFormat = "skill-yaml" | "skill-md" | "server-json" | "zip";
export type McpTransport = "stdio" | "sse" | "streamable-http";

export interface SkillFile {
  path: string;
  size: number;
  content_type: string;
  sha256: string;
}

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityFinding {
  severity: SecuritySeverity;
  code: string;
  message: string;
  path?: string;
}

export interface SecurityScanResult {
  status: "passed" | "warning" | "blocked";
  scanned_at: string;
  findings: SecurityFinding[];
}

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
  mcp_config?: Record<string, unknown>;
  files?: SkillFile[];
  status: SkillStatus;
  review_requested_by?: string;
  review_requested_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  security?: SecurityScanResult;
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
  tag?: string;
  author?: string;
  sort?: "newest" | "name" | "relevance" | "downloads";
  page?: number;
  limit?: number;
}

// ── RBAC ──

export type OrgRole = "owner" | "admin" | "member";

export interface OrgUser {
  id: string; // GitHub login or Google email, lowercase
  role: OrgRole;
  display_name: string;
  provider: "github" | "google";
  avatar_url?: string;
  joined_at: string; // ISO
  last_seen_at: string; // ISO
}

export interface ApiToken {
  hash: string; // SHA-256 of raw token (storage key)
  user_id: string;
  org_slug?: string;
  label: string;
  created_at: string;
}

export type Permission =
  | "skill:publish"
  | "skill:edit_own"
  | "skill:delete_own"
  | "skill:edit_any"
  | "skill:delete_any"
  | "members:invite"
  | "members:remove"
  | "members:change_role"
  | "settings:manage"
  | "org:delete"
  | "org:transfer_ownership"
  | "tokens:manage_own"
  | "tokens:manage_any";

// ── Invitations ──

export interface Invitation {
  token: string;
  email: string;
  role: OrgRole;
  invited_by: string;
  org_slug?: string;
  created_at: string;
  expires_at: string;
}

// ── Audit log ──

export type AuditAction =
  | "org.created"
  | "org.deleted"
  | "org.settings.updated"
  | "member.invited"
  | "member.added"
  | "member.role_changed"
  | "member.removed"
  | "registry.item.published"
  | "registry.item.submitted"
  | "registry.item.updated"
  | "registry.item.status_changed"
  | "registry.item.deleted";

export interface AuditEvent {
  id: string;
  org_slug?: string;
  actor: string;
  action: AuditAction;
  target_type: "org" | "member" | "invitation" | "registry_item";
  target_id: string;
  metadata?: Record<string, string | number | boolean | null>;
  created_at: string;
}
