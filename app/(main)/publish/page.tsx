import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PublishWizard } from "@/components/publish-wizard";
import { getCategories } from "@/lib/registry";
import { SkillType } from "@/lib/types";

const VALID_TYPES: SkillType[] = ["skill", "mcp-server", "agent-tool", "prompt-template"];

export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const params = await searchParams;
  const preselectedType = VALID_TYPES.includes(params.type as SkillType)
    ? (params.type as SkillType)
    : undefined;

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-medium tracking-tight">Publish</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Submit a skill, MCP server, tool, or prompt template to the registry.
      </p>
      <PublishWizard categories={categories} preselectedType={preselectedType} />
    </div>
  );
}
