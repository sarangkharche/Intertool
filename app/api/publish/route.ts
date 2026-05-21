import { NextRequest } from "next/server";
import {
  generateInstallCommands,
  getSkillBySlug,
  replaceSkillFiles,
  upsertSkill,
} from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { validateSkillInput } from "@/lib/validation";
import { apiError } from "@/lib/api-utils";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  checkRateLimit,
  rateLimitResponse,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/rbac";
import { getOrgSlug } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import type {
  McpTransport,
  SourceFormat,
  SkillType,
  SkillStatus,
} from "@/lib/types";

function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "arrayBuffer" in value
  );
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  if (!hasPermission(authResult.role, "skill:publish")) {
    return apiError("You do not have permission to publish skills", 403);
  }

  // Rate limit: 10 publishes per minute per user
  const rl = await checkRateLimit(`publish:${authResult.username}`, {
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const formData = await request.formData();

  const name = (formData.get("name") as string) ?? "";
  const slug = (formData.get("slug") as string) ?? "";
  const type = (formData.get("type") as string) ?? "";
  const description = (formData.get("description") as string) ?? "";
  const readmeRaw = formData.get("readme");
  const readme = typeof readmeRaw === "string" ? readmeRaw : "";
  const category = (formData.get("category") as string) ?? "";

  let tags: string[];
  try {
    tags = JSON.parse((formData.get("tags") as string) || "[]");
  } catch {
    tags = [];
  }
  let compatibility: string[];
  try {
    compatibility = JSON.parse(
      (formData.get("compatibility") as string) || "[]"
    );
  } catch {
    compatibility = [];
  }

  const sourceUrl = (formData.get("source_url") as string) || undefined;
  const sourceFormat = (formData.get("source_format") as string) || undefined;
  const transport = (formData.get("transport") as string) || undefined;
  const changelog = (formData.get("changelog") as string) || undefined;
  const uploadedFiles = formData
    .getAll("files")
    .filter(isUploadedFile)
    .filter((file) => file.size > 0);

  // Validate input
  const validation = validateSkillInput({
    slug,
    name,
    type,
    description,
    tags,
    readme,
    source_url: sourceUrl,
    transport,
  });

  if (!validation.valid) {
    return apiError("Validation failed", 400, validation.errors);
  }

  if (!category) {
    return apiError("Category is required", 400);
  }

  const { username } = authResult;
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  const existingSkill = await getSkillBySlug(slug);
  if (existingSkill) {
    if (existingSkill.type !== type) {
      return apiError("A published item cannot change type", 409);
    }

    const isAuthor =
      existingSkill.author.toLowerCase() === username.toLowerCase();
    const canEdit =
      (isAuthor && hasPermission(authResult.role, "skill:edit_own")) ||
      hasPermission(authResult.role, "skill:edit_any");
    if (!canEdit) {
      return apiError(
        "Only the item author or an admin can update this item",
        403
      );
    }
  }

  const adminPublisher = hasPermission(authResult.role, "skill:edit_any");
  const reviewRequired =
    settings?.publish_review_required === true &&
    !adminPublisher &&
    (!existingSkill || existingSkill.status === "review");
  const now = new Date().toISOString();
  const nextStatus: SkillStatus = reviewRequired
    ? "review"
    : existingSkill?.status === "review" && adminPublisher
      ? "published"
      : (existingSkill?.status ?? "published");

  const installCommands = generateInstallCommands({
    type,
    slug,
    author: username,
    source_url: sourceUrl,
    transport: transport as McpTransport | undefined,
  });

  try {
    const files =
      uploadedFiles.length > 0
        ? await replaceSkillFiles(
            slug,
            type,
            await Promise.all(
              uploadedFiles.map(async (file) => ({
                path: file.name,
                size: file.size,
                contentType: file.type || "application/octet-stream",
                body: new Uint8Array(await file.arrayBuffer()),
              }))
            )
          )
        : (existingSkill?.files ?? []);

    await upsertSkill(
      {
        slug,
        name,
        type: type as SkillType,
        description,
        readme: readme || `# ${name}\n\n${description}\n`,
        author: username,
        category_slug: category,
        tags,
        compatibility,
        install_command:
          installCommands["Intertool CLI"] ??
          installCommands["Claude Code"] ??
          `npx intertool install @${username}/${slug}`,
        install_commands: installCommands,
        source_url: sourceUrl,
        source_format: sourceFormat as SourceFormat | undefined,
        transport: transport as McpTransport | undefined,
        files: files.length > 0 ? files : undefined,
        status: nextStatus,
        review_requested_by: reviewRequired ? username : undefined,
        review_requested_at: reviewRequired ? now : undefined,
        created_at: now,
      },
      changelog
    );

    await appendAuditEvent({
      org_slug: orgSlug,
      actor: username,
      action: reviewRequired
        ? "registry.item.submitted"
        : existingSkill
          ? "registry.item.updated"
          : "registry.item.published",
      target_type: "registry_item",
      target_id: slug,
      metadata: {
        type,
        status: nextStatus,
        version: existingSkill?.version ?? "1.0.0",
      },
    });

    return NextResponse.json(
      {
        slug,
        status: nextStatus,
        message: reviewRequired
          ? "Skill submitted for review"
          : "Skill published",
      },
      { status: 201, headers: rateLimitHeaders(rl) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish";
    return apiError(message, 500);
  }
}
