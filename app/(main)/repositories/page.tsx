import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type { MeResponse, RepositorySummary } from "@/lib/memory-types";
import { RepositoryManager } from "@/components/memory/repository-manager";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Repositories");
export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/repositories");
  let repositories: { items: RepositorySummary[] };
  let me: MeResponse;
  try {
    [repositories, me] = await Promise.all([
      intertoolApi<{ items: RepositorySummary[] }>("/api/repositories"),
      intertoolApi<MeResponse>("/api/me"),
    ]);
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8 border-b border-border-subtle pb-6">
        <h1 className="text-lg font-medium tracking-tight">Repositories</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Namespaced sources for precise, tenant-safe context retrieval.
        </p>
      </div>
      <RepositoryManager
        repositories={repositories.items}
        canManage={me.user.role !== "member"}
      />
    </div>
  );
}
