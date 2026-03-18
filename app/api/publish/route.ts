import { NextRequest, NextResponse } from "next/server";
import { generateInstallCommands, upsertSkill } from "@/lib/registry";
import { authenticateApi, isAuthenticated } from "@/lib/api-auth";
import type { McpTransport, SourceFormat, SkillType, SkillStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const authResult = await authenticateApi(request);
  if (!isAuthenticated(authResult)) return authResult;

  const formData = await request.formData();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const type = formData.get("type") as string;
  const description = formData.get("description") as string;
  const readme = formData.get("readme") as string;
  const category = formData.get("category") as string;
  const tags = JSON.parse((formData.get("tags") as string) || "[]");
  const compatibility = JSON.parse(
    (formData.get("compatibility") as string) || "[]"
  );
  const sourceUrl = (formData.get("source_url") as string) || undefined;
  const sourceFormat = (formData.get("source_format") as string) || undefined;
  const transport = (formData.get("transport") as string) || undefined;
  const changelog = (formData.get("changelog") as string) || undefined;

  if (!name || !slug || !type || !description || !category) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { username } = authResult;

  const installCommands = generateInstallCommands({
    type,
    slug,
    author: username,
    source_url: sourceUrl,
    transport: transport as McpTransport | undefined,
  });

  try {
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
        status: "published" as SkillStatus,
        created_at: new Date().toISOString(),
      },
      changelog
    );

    return NextResponse.json(
      { slug, message: "Skill published" },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
