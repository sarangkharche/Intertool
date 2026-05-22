import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PublishWizard } from "@/components/publish-wizard";
import { getCategories } from "@/lib/registry";
import { SkillType } from "@/lib/types";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Publish");

const VALID_TYPES: SkillType[] = [
  "skill",
  "mcp-server",
  "agent-tool",
  "prompt-template",
];
const VALID_MODES = ["choose", "quick", "manual"] as const;

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
  const initialMode = VALID_MODES.includes(
    params.mode as (typeof VALID_MODES)[number]
  )
    ? (params.mode as (typeof VALID_MODES)[number])
    : "choose";

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-xl font-medium tracking-tight">Publish</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Submit a skill, MCP server, tool, or prompt template to the registry.
      </p>
      <PublishWizard
        categories={categories}
        preselectedType={preselectedType}
        initialMode={initialMode}
      />
    </div>
  );
}
