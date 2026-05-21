import { NextRequest, NextResponse } from "next/server";
import { getSkillBySlug, deleteSkill, updateSkillStatus } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { apiError } from "@/lib/api-utils";
import { appendAuditEvent } from "@/lib/audit-log";
import { trackDownload } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { hasPermission } from "@/lib/rbac";
import { noStoreHeaders } from "@/lib/cache-control";
import { canViewRegistryItem } from "@/lib/registry-access";
import type { SkillStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) {
    return apiError("Skill not found", 404);
  }
  if (
    !canViewRegistryItem(skill, {
      username: authResult.username,
      role: authResult.role,
    })
  ) {
    return apiError("Skill not found", 404);
  }

  // Track download (fire-and-forget)
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  trackDownload(slug, settings).catch(() => {});

  return NextResponse.json(skill, {
    headers: noStoreHeaders(),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  if (!hasPermission(authResult.role, "skill:edit_any")) {
    return apiError("Only admins can review registry items", 403);
  }

  const { slug } = await params;
  let body: { status?: SkillStatus };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const status = body.status;
  if (!status || !["review", "published", "archived"].includes(status)) {
    return apiError("status must be review, published, or archived", 400);
  }

  try {
    const orgSlug = await getOrgSlug();
    const updated = await updateSkillStatus(slug, status, authResult.username);
    await appendAuditEvent({
      org_slug: orgSlug,
      actor: authResult.username,
      action: "registry.item.status_changed",
      target_type: "registry_item",
      target_id: slug,
      metadata: {
        type: updated.type,
        status,
      },
    });

    return NextResponse.json(updated, { headers: noStoreHeaders() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update status";
    return apiError(message, message === "Skill not found" ? 404 : 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) {
    return apiError("Skill not found", 404);
  }

  if (authResult.username === "unknown") {
    return apiError("Cannot determine authenticated user", 403);
  }

  const isAuthor =
    skill.author.toLowerCase() === authResult.username.toLowerCase();
  const canDeleteAny = hasPermission(authResult.role, "skill:delete_any");

  if (!isAuthor && !canDeleteAny) {
    return apiError(
      "Only the skill author or an admin can delete this skill",
      403
    );
  }

  await deleteSkill(slug, skill.type);
  await appendAuditEvent({
    org_slug: await getOrgSlug(),
    actor: authResult.username,
    action: "registry.item.deleted",
    target_type: "registry_item",
    target_id: slug,
    metadata: {
      type: skill.type,
      version: skill.version ?? null,
    },
  });
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
}
