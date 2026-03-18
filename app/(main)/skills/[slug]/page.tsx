import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillReadme } from "@/components/skill-readme";
import { InstallCommand } from "@/components/install-command";
import { TypeBadge } from "@/components/skill-card";
import { getSkillBySlug, getSkillVersions } from "@/lib/registry";
import { Calendar, ExternalLink, Pencil } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { DeleteSkillButton } from "@/components/delete-skill-button";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { slug } = await params;

  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const versions = await getSkillVersions(slug);
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
      <nav className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">registry</Link>
        <span>/</span>
        <Link href="/browse" className="hover:text-foreground">skills</Link>
        <span>/</span>
        <span className="text-foreground">{skill.slug}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div>
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-xl font-medium tracking-tight">{skill.name}</h1>
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
              {isAuthor && (
                <>
                  <Link
                    href={`/skills/${skill.slug}/edit`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
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
              <TabsTrigger value="readme" className="text-sm">README</TabsTrigger>
              <TabsTrigger value="install" className="text-sm">Install</TabsTrigger>
              <TabsTrigger value="versions" className="text-sm">
                Versions ({versions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="readme" className="mt-4">
              {skill.readme ? (
                <div className="rounded-lg border border-border p-6">
                  <SkillReadme content={skill.readme} />
                </div>
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
                  {versions.map((v, i) => (
                    <div
                      key={v.version}
                      className={`flex items-start gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">v{v.version}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {v.changelog && (
                          <p className="mt-1 text-sm text-muted-foreground">{v.changelog}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No versions published yet.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar — unified panel */}
        <aside className="rounded-lg border border-border divide-y divide-border">
          {/* Author */}
          <div className="p-4">
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">Author</h3>
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
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  GitHub <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Install */}
          <div className="p-4">
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">Install</h3>
            <div className="space-y-2">
              {Object.keys(installCommands).length > 0 ? (
                Object.entries(installCommands).slice(0, 2).map(([tool, cmd]) => (
                  <div key={tool}>
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground/60">
                      {tool}
                    </p>
                    <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
                      {cmd}
                    </code>
                  </div>
                ))
              ) : (
                <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
                  {primaryInstallCmd}
                </code>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-4">
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Published
                </span>
                <span className="font-mono text-xs">
                  {new Date(skill.created_at).toLocaleDateString()}
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
                    {new Date(skill.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
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
            <div className="p-4">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">Source</h3>
              <a
                href={skill.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                {skill.source_url.replace("https://github.com/", "")}
              </a>
            </div>
          )}

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div className="p-4">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">Tags</h3>
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
            <div className="p-4">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">Works with</h3>
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
    </div>
  );
}
