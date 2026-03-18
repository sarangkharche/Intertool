import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSkills } from "@/lib/registry";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { skills } = await getSkills({ limit: 1000 });

  // Group skills by author to derive team members
  const authorMap = new Map<string, number>();
  for (const s of skills) {
    authorMap.set(s.author, (authorMap.get(s.author) ?? 0) + 1);
  }
  const authors = Array.from(authorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-xl font-medium tracking-tight">Team</h1>
      <p className="mb-6 text-muted-foreground">
        Contributors to the skill registry.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Contributors ({authors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authors.length > 0 ? (
            <div className="space-y-2">
              {authors.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <p className="text-sm font-medium">{a.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {a.count} skill{a.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No contributors yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
