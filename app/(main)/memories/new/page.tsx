import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type { RepositorySummary } from "@/lib/memory-types";
import { MemoryForm } from "@/components/memory/memory-form";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("New memory");

export default async function NewMemoryPage() {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/memories/new");
  let repositories: { items: RepositorySummary[] };
  try {
    repositories = await intertoolApi("/api/repositories");
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 border-b border-border-subtle pb-6">
        <h1 className="text-lg font-medium tracking-tight">Create a memory</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Capture one durable learning and make its provenance clear.
        </p>
      </div>
      <MemoryForm repositories={repositories.items} />
    </div>
  );
}
