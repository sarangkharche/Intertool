import { z } from "zod";

export const roleSchema = z.enum(["owner", "admin", "member"]);
export const memoryTypeSchema = z.enum([
  "decision",
  "convention",
  "warning",
  "discovery",
  "ownership",
  "runbook",
]);
export const memoryStatusSchema = z.enum([
  "draft",
  "published",
  "disputed",
  "archived",
]);
export const memoryConfidenceSchema = z.enum(["tentative", "confirmed"]);
export const reportReasonSchema = z.enum([
  "stale",
  "incorrect",
  "conflicting",
  "secret_or_sensitive",
  "other",
]);

const relativePath = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((value) => !value.startsWith("/") && !value.startsWith("\\"), {
    message: "Paths must be repository-relative",
  })
  .refine(
    (value) =>
      !value
        .replaceAll("\\", "/")
        .split("/")
        .some((segment) => segment === ".."),
    { message: "Paths cannot contain traversal segments" }
  );

const httpsUrl = z
  .string()
  .trim()
  .max(2_000)
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Source URLs must use HTTPS",
  });

const repositoryNamePattern = /^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+$/;

function normalizeGitHubRepository(value: string): string | null {
  let repository = value.trim();

  if (/^https?:\/\//i.test(repository)) {
    try {
      const url = new URL(repository);
      if (
        url.protocol !== "https:" ||
        !["github.com", "www.github.com"].includes(
          url.hostname.toLowerCase()
        ) ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash
      ) {
        return null;
      }
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length !== 2) return null;
      repository = segments.join("/");
    } catch {
      return null;
    }
  }

  repository = repository.replace(/\.git$/i, "");
  return repositoryNamePattern.test(repository) ? repository : null;
}

export const repositoryNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .transform((value, context) => {
    const repository = normalizeGitHubRepository(value);
    if (repository) return repository;
    context.addIssue({
      code: "custom",
      message: "Enter owner/repository or its GitHub URL",
    });
    return z.NEVER;
  });

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const createRepositorySchema = z.object({
  full_name: repositoryNameSchema,
  default_branch: z.string().trim().min(1).max(200).default("main"),
});

export const updateRepositorySchema = createRepositorySchema.partial();

export const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expires_at: z.iso.datetime().nullable().optional(),
});

const editableMemoryFields = {
  repository_id: z.uuid().nullable().optional(),
  type: memoryTypeSchema,
  title: z.string().trim().min(4).max(160),
  content: z.string().trim().min(10).max(8_000),
  confidence: memoryConfidenceSchema.default("tentative"),
  paths: z.array(relativePath).max(30).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  source_url: httpsUrl.nullable().optional(),
  source_label: z.string().trim().min(1).max(120).nullable().optional(),
  expires_at: z.iso.datetime().nullable().optional(),
};

export const createMemorySchema = z.object(editableMemoryFields);
export const updateMemorySchema = z
  .object(editableMemoryFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  });

export const reportMemorySchema = z.object({
  reason: reportReasonSchema,
  comment: z.string().trim().min(3).max(1_000),
});

export const paginationSchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const memoryListQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(500).optional(),
  repository_id: z.uuid().optional(),
  type: memoryTypeSchema.optional(),
  status: memoryStatusSchema.optional(),
  confidence: memoryConfidenceSchema.optional(),
});

export const personalMemorySourceKindSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, {
    message: "Use lowercase letters, numbers, hyphens, or underscores",
  });

export const personalMemoryImportSchema = z.object({
  source_kind: personalMemorySourceKindSchema,
  source_key: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => !value.startsWith("/") && !value.startsWith("\\"), {
      message: "Source keys must be relative",
    })
    .refine(
      (value) =>
        !value
          .replaceAll("\\", "/")
          .split("/")
          .some((segment) => segment === ".."),
      { message: "Source keys cannot contain traversal segments" }
    ),
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(900_000),
  source_modified_at: z.iso.datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const personalMemoryListQuerySchema = paginationSchema.extend({
  query: z.string().trim().max(500).optional(),
  source_kind: personalMemorySourceKindSchema.optional(),
});

export const searchContextSchema = z.object({
  query: z.string().trim().min(2).max(500),
  repository: repositoryNameSchema,
  paths: z.array(relativePath).max(30).default([]),
  types: z.array(memoryTypeSchema).max(6).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

export const getContextSchema = z.object({
  repository: repositoryNameSchema,
  task: z.string().trim().min(2).max(1_000),
  paths: z.array(relativePath).max(30).default([]),
  limit: z.number().int().min(1).max(8).default(8),
  max_characters: z.number().int().min(500).max(8_000).default(4_000),
});

export const proposeMemorySchema = z.object({
  repository: repositoryNameSchema.optional(),
  type: memoryTypeSchema,
  title: z.string().trim().min(4).max(160),
  content: z.string().trim().min(10).max(8_000),
  paths: z.array(relativePath).max(30).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  source_url: httpsUrl.nullable().optional(),
  source_label: z.string().trim().min(1).max(120).nullable().optional(),
  confidence: memoryConfidenceSchema.default("tentative"),
  expires_at: z.iso.datetime().nullable().optional(),
});

export const publishMemorySchema = z.object({ memory_id: z.uuid() });
export const reportStaleSchema = reportMemorySchema.extend({
  memory_id: z.uuid(),
});

const highConfidenceSecretPatterns: Array<[RegExp, string]> = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, "private key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bgh[opsu]_[A-Za-z0-9]{30,}\b/, "GitHub token"],
  [/\bsk-(?:live|proj)-[A-Za-z0-9_-]{20,}\b/, "API secret"],
  [
    /(?:password|secret|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9/+_.-]{16,}/i,
    "credential",
  ],
];

export function detectSecretLikeContent(value: string): string | null {
  for (const [pattern, label] of highConfidenceSecretPatterns) {
    if (pattern.test(value)) return label;
  }
  return null;
}

export type Role = z.infer<typeof roleSchema>;
export type MemoryType = z.infer<typeof memoryTypeSchema>;
export type MemoryStatus = z.infer<typeof memoryStatusSchema>;
export type MemoryConfidence = z.infer<typeof memoryConfidenceSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type PersonalMemoryImportInput = z.infer<
  typeof personalMemoryImportSchema
>;
export type SearchContextInput = z.infer<typeof searchContextSchema>;
export type GetContextInput = z.infer<typeof getContextSchema>;
export type ProposeMemoryInput = z.infer<typeof proposeMemorySchema>;
