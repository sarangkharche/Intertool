import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSkillBySlug, getSkillVersions } from "@/lib/registry";
import { ArrowLeft } from "lucide-react";

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const versions = await getSkillVersions(slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/skills/${slug}`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {skill.name}
        </Button>
      </Link>

      <h1 className="mb-6 text-xl font-medium tracking-tight">
        Versions &mdash; {skill.name}
      </h1>

      <div className="space-y-3">
        {versions.length > 0 ? (
          versions.map((v) => (
            <Card key={v.version}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-lg font-semibold">
                      v{v.version}
                    </span>
                    <span className="ml-3 text-sm text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {v.changelog && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {v.changelog}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            No versions published yet.
          </p>
        )}
      </div>
    </div>
  );
}
