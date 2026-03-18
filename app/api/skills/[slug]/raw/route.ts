import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSkillBySlug } from "@/lib/registry";

/**
 * Serves raw skill content as text/markdown.
 * Used by `claude skill add <url>` and other tools that fetch skill content.
 * Requires authentication (session or API key).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Auth: session or API key
  const session = await auth();
  const apiKey = process.env.INTERTOOL_API_KEY;
  const authHeader = request.headers.get("authorization");
  const hasApiKey = apiKey && authHeader === `Bearer ${apiKey}`;

  if (!session?.user && !hasApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(skill.readme, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
