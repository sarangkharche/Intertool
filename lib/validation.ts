import type { SkillType, McpTransport } from "./types";

const VALID_TYPES: SkillType[] = ["skill", "mcp-server", "agent-tool", "prompt-template"];
const VALID_TRANSPORTS: McpTransport[] = ["stdio", "sse", "streamable-http"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const MAX_README_BYTES = 5 * 1024 * 1024;
const RESERVED_SLUGS = [
  "_index", "_categories", "_analytics", "_meta",
  "api", "admin", "settings", "publish", "search", "dashboard",
];

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateSkillInput(input: {
  slug?: string;
  name?: string;
  type?: string;
  description?: string;
  tags?: unknown;
  readme?: string;
  source_url?: string;
  transport?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // slug
  if (!input.slug) {
    errors.push({ field: "slug", message: "Slug is required" });
  } else if (input.slug.length > 64) {
    errors.push({ field: "slug", message: "Slug must be at most 64 characters" });
  } else if (!SLUG_RE.test(input.slug)) {
    errors.push({ field: "slug", message: "Slug must be lowercase alphanumeric with hyphens, starting with a letter or digit" });
  } else if (RESERVED_SLUGS.includes(input.slug)) {
    errors.push({ field: "slug", message: "This slug is reserved and cannot be used" });
  }

  // name
  if (!input.name) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (input.name.length > 100) {
    errors.push({ field: "name", message: "Name must be at most 100 characters" });
  }

  // type
  if (!input.type) {
    errors.push({ field: "type", message: "Type is required" });
  } else if (!VALID_TYPES.includes(input.type as SkillType)) {
    errors.push({ field: "type", message: `Type must be one of: ${VALID_TYPES.join(", ")}` });
  }

  // description
  if (!input.description) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (input.description.length > 500) {
    errors.push({ field: "description", message: "Description must be at most 500 characters" });
  }

  // tags
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) {
      errors.push({ field: "tags", message: "Tags must be an array" });
    } else {
      if (input.tags.length > 10) {
        errors.push({ field: "tags", message: "At most 10 tags allowed" });
      }
      for (const tag of input.tags) {
        if (typeof tag !== "string" || tag.length > 30) {
          errors.push({ field: "tags", message: "Each tag must be a string of at most 30 characters" });
          break;
        }
      }
    }
  }

  // readme
  if (input.readme && new TextEncoder().encode(input.readme).length > MAX_README_BYTES) {
    errors.push({ field: "readme", message: "Readme must be at most 5MB" });
  }

  // source_url
  if (input.source_url) {
    try {
      new URL(input.source_url);
    } catch {
      errors.push({ field: "source_url", message: "Source URL must be a valid URL" });
    }
  }

  // transport
  if (input.transport && !VALID_TRANSPORTS.includes(input.transport as McpTransport)) {
    errors.push({ field: "transport", message: `Transport must be one of: ${VALID_TRANSPORTS.join(", ")}` });
  }

  return { valid: errors.length === 0, errors };
}
