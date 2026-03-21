import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillReadme } from "@/components/skill-readme";
import { InstallCommand } from "@/components/install-command";
import { TypeBadge } from "@/components/skill-card";
import { getSkillBySlug, getSkillVersions, getRelatedSkills } from "@/lib/registry";
import { Calendar, Clock, Download, ExternalLink, GitCompareArrows, Pencil } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { DeleteSkillButton } from "@/components/delete-skill-button";
import { DownloadStats } from "@/components/download-stats";


export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { slug } = await params;

  const [skill, versions, relatedSkills] = await Promise.all([
    getSkillBySlug(slug),
    getSkillVersions(slug),
    getRelatedSkills(slug),
  ]);
  if (!skill) notFound();
  const username = (session?.user as { username?: string } | undefined)?.username;
  const isAuthor = username && skill.author.toLowerCase() === username.toLowerCase();

  const installCommands = skill.install_commands ?? {};
  const primaryInstallCmd =
    installCommands["Claude Code"] ??
    installCommands["Intertool CLI"] ??
    `npx intertool install @${skill.author}/${skill.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted-foreground/70">
        <Link href="/" className="hover:text-foreground transition-colors duration-100">registry</Link>
        <span>/</span>
        <Link href="/browse" className="hover:text-foreground transition-colors duration-100">skills</Link>
        <span>/</span>
        <span className="text-foreground">{skill.slug}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-lg text-display">{skill.name}</h1>
              {skill.version && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  v{skill.version}
                </span>
              )}
              <TypeBadge type={skill.type} />
              {skill.source_format && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {skill.source_format.replace("-", " ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm text-muted-foreground">
                @{skill.author}/{skill.slug}
              </p>
              <ShareButton slug={skill.slug} />
              <a
                href={`/api/skills/${skill.slug}/raw`}
                download={`${skill.slug}.md`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground interactive-ghost"
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              {isAuthor && (
                <>
                  <Link
                    href={`/skills/${skill.slug}/edit`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground interactive-ghost"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <DeleteSkillButton slug={skill.slug} />
                </>
              )}
            </div>
          </div>

          {/* Primary install command */}
          <div className="mb-6">
            <InstallCommand command={primaryInstallCmd} />
          </div>

          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            {skill.description}
          </p>

          {/* Tabs */}
          <Tabs defaultValue="readme">
            <TabsList>
              <TabsTrigger value="readme" className="text-sm">Content</TabsTrigger>
              <TabsTrigger value="install" className="text-sm">Install</TabsTrigger>
              <TabsTrigger value="versions" className="text-sm">
                Versions ({versions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="readme" className="mt-4">
              {skill.readme ? (
                <SkillReadme content={skill.readme} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No README provided.
                </p>
              )}
            </TabsContent>

            <TabsContent value="install" className="mt-4">
              <div className="space-y-3">
                {Object.keys(installCommands).length > 0 ? (
                  Object.entries(installCommands).map(([tool, cmd]) => (
                    <div key={tool}>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        {tool}
                      </p>
                      <InstallCommand command={cmd} />
                    </div>
                  ))
                ) : (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      CLI
                    </p>
                    <InstallCommand command={primaryInstallCmd} />
                  </div>
                )}

                {skill.source_url && (
                  <div className="mt-4 rounded-md bg-muted/50 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      Source:{" "}
                      <a
                        href={skill.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono underline"
                      >
                        {skill.source_url}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="versions" className="mt-4 space-y-2">
              {versions.length > 0 ? (
                <div className="space-y-0 rounded-lg border border-border">
                  {versions.map((v, i) => {
                    const toVersion = i === 0 ? "current" : versions[i - 1].version;
                    return (
                      <div
                        key={v.version}
                        className={`flex items-start justify-between gap-3 p-4 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">v{v.version}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(v.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                              </span>
                            </div>
                            {v.changelog && (
                              <p className="mt-1 text-sm text-muted-foreground">{v.changelog}</p>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/skills/${slug}/versions/diff?from=${v.version}&to=${toVersion}`}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                        >
                          <GitCompareArrows className="h-3 w-3" aria-hidden="true" />
                          Diff
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No versions published yet.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="rounded-lg border border-border/60">
          {/* Author */}
          <div className="p-4">
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Author</h3>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {skill.author.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{skill.author}</p>
                <a
                  href={`https://github.com/${skill.author}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-100"
                >
                  GitHub <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="border-t border-border-subtle p-4">
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Published
                </span>
                <span className="font-mono text-xs">
                  {new Date(skill.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
              </div>
              {skill.version && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono text-xs">v{skill.version}</span>
                </div>
              )}
              {skill.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-mono text-xs">
                    {new Date(skill.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
              )}
              <FreshnessBadge date={skill.updated_at ?? skill.created_at} />
              <DownloadStats slug={skill.slug} />
              {skill.transport && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transport</span>
                  <span className="font-mono text-xs">{skill.transport}</span>
                </div>
              )}
              {skill.source_format && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-mono text-xs">{skill.source_format.replace("-", " ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Source */}
          {skill.source_url && (
            <div className="border-t border-border-subtle p-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Source</h3>
              <a
                href={skill.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-100"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {skill.source_url.replace("https://github.com/", "")}
              </a>
            </div>
          )}

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div className="border-t border-border-subtle p-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {skill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {skill.compatibility.length > 0 && (
            <div className="border-t border-border-subtle p-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Works with</h3>
              <div className="flex flex-wrap gap-1.5">
                {skill.compatibility.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Related Skills */}
      {relatedSkills.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Related Skills</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedSkills.map((rs) => (
              <Link
                key={rs.slug}
                href={`/skills/${rs.slug}`}
                className="rounded-lg border border-border/60 p-3 transition-colors hover:border-border hover:bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rs.name}</span>
                  <TypeBadge type={rs.type} />
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{rs.description}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">@{rs.author}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FreshnessBadge({ date }: { date: string }) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  let label: string;
  let colorClass: string;

  if (days < 1) {
    label = "Updated today";
    colorClass = "text-emerald-600 dark:text-emerald-400";
  } else if (days < 30) {
    label = `Updated ${rtf.format(-days, "day")}`;
    colorClass = "text-emerald-600 dark:text-emerald-400";
  } else if (days < 90) {
    const weeks = Math.floor(days / 7);
    label = `Updated ${rtf.format(-weeks, "week")}`;
    colorClass = "text-amber-600 dark:text-amber-400";
  } else {
    const months = Math.floor(days / 30);
    label = `Updated ${rtf.format(-months, "month")}`;
    colorClass = "text-muted-foreground/60";
  }

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3 w-3" />
        Freshness
      </span>
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
    </div>
  );
}
