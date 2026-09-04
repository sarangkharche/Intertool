import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import type { PersonalMemorySummary } from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Personal memory");
export const dynamic = "force-dynamic";

export default async function PersonalMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/my-memory");
  const { id } = await params;
  let memory: PersonalMemorySummary;
  try {
    ({ memory } = await intertoolApi<{ memory: PersonalMemorySummary }>(
      `/api/personal-memories/${id}`
    ));
  } catch (error) {
    if ((error as { status?: number }).status === 404) notFound();
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <Link
        href="/my-memory"
        className="mb-7 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> My memory
      </Link>

      <div className="border-b border-border-subtle pb-7">
        <div className="mb-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-mono uppercase tracking-[0.14em]">
            Private · {memory.source_kind.replaceAll("_", " ")}
          </span>
        </div>
        <h1 className="text-xl font-medium tracking-tight">{memory.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] text-muted-foreground">
          <span>{memory.source_key}</span>
          <span>Imported {formatDate(memory.updated_at)}</span>
        </div>
      </div>

      <article className="mt-7 overflow-hidden rounded-lg border border-border-subtle bg-surface">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-foreground sm:p-7">
          {memory.content}
        </pre>
      </article>
    </div>
  );
}
