export type MemoryType =
  "decision" | "convention" | "warning" | "discovery" | "ownership" | "runbook";
export type MemoryStatus = "draft" | "published" | "disputed" | "archived";
export type MemoryConfidence = "tentative" | "confirmed";

export interface RepositorySummary {
  id: string;
  provider: "github";
  full_name: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

export interface MemorySummary {
  id: string;
  organization_id: string;
  repository_id: string | null;
  repository_full_name: string | null;
  type: MemoryType;
  title: string;
  content: string;
  status: MemoryStatus;
  confidence: MemoryConfidence;
  paths: string[];
  tags: string[];
  source_url: string | null;
  source_label: string | null;
  created_by: string;
  author_name: string;
  published_by: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  open_report_count?: number;
}

export interface PersonalMemorySummary {
  id: string;
  user_id: string;
  source_kind: string;
  source_key: string;
  title: string;
  content: string;
  content_hash: string;
  source_modified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PersonalMemoryStats {
  total: number;
  last_imported_at: string | null;
  sources: Array<{ source_kind: string; count: number }>;
  collections: Array<{
    source_kind: string;
    collection_key: string;
    count: number;
  }>;
}

export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "admin" | "member";
  };
  organization: { id: string; name: string; slug: string };
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
