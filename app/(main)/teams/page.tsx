import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContributors } from "@/lib/registry";
import { Users } from "lucide-react";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const authors = await getContributors();

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
