import { NextRequest, NextResponse } from "next/server";
import { getSkillBySlug, deleteSkill } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import { apiError } from "@/lib/api-utils";
import { trackDownload } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { getOrgSlug } from "@/lib/org";
import { hasPermission } from "@/lib/rbac";

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

  // Track download (fire-and-forget)
  const orgSlug = await getOrgSlug();
  const settings = await getSettings(orgSlug);
  trackDownload(slug, settings).catch(() => {});

  return NextResponse.json(skill, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
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

  const isAuthor = skill.author.toLowerCase() === authResult.username.toLowerCase();
  const canDeleteAny = hasPermission(authResult.role, "skill:delete_any");

  if (!isAuthor && !canDeleteAny) {
    return apiError("Only the skill author or an admin can delete this skill", 403);
  }

  await deleteSkill(slug, skill.type);
  return NextResponse.json({ ok: true });
}
