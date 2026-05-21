import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getSkillBySlug,
  getSkillVersion,
  getSkillVersions,
} from "@/lib/registry";
import { ArrowLeft } from "lucide-react";
import { VersionDiff } from "@/components/version-diff";
import { VersionPicker } from "./version-picker";
import { auth } from "@/lib/auth";
import { getOrgSlug } from "@/lib/org";
import { getUserRole } from "@/lib/rbac";
import { canViewRegistryItem } from "@/lib/registry-access";

export default async function DiffPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { slug } = await params;
  const { from, to } = await searchParams;

  if (!from || !to) notFound();

  const [skill, versions] = await Promise.all([
    getSkillBySlug(slug),
    getSkillVersions(slug),
  ]);
  if (!skill) notFound();

  const username = (session.user as { username?: string }).username ?? "";
  const orgSlug = await getOrgSlug();
  const role = username ? await getUserRole(username, orgSlug) : null;
  if (!canViewRegistryItem(skill, { username, role })) notFound();

  const [oldVer, newVer] = await Promise.all([
    getSkillVersion(slug, from),
    getSkillVersion(slug, to),
  ]);

  const oldContent = oldVer?.readme ?? "";
  const newContent =
    to === "current" ? (skill.readme ?? "") : (newVer?.readme ?? "");
  const newLabel = to === "current" ? (skill.version ?? to) : to;

  // Build snapshot data for metadata diffs
  const oldSnapshot = oldVer?.snapshot ?? null;
  const newSnapshot = to === "current" ? skill : (newVer?.snapshot ?? null);

  // Build version options for picker
  const versionOptions = versions.map((v) => v.version);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/skills/${slug}/versions`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to versions
        </Button>
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight">
          Diff &mdash; {skill.name}
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs text-destructive">
            v{from}
          </span>
          <span>&rarr;</span>
          <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-xs text-success">
            v{newLabel}
          </span>
        </div>
      </div>

      <VersionPicker
        slug={slug}
        versions={versionOptions}
        currentVersion={skill.version ?? ""}
        selectedFrom={from}
        selectedTo={to}
      />

      <VersionDiff
        oldVersion={from}
        newVersion={newLabel}
        oldContent={oldContent}
        newContent={newContent}
        oldSnapshot={oldSnapshot}
        newSnapshot={newSnapshot}
      />
    </div>
  );
}
