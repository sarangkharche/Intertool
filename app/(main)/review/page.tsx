import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSkills } from "@/lib/registry";
import { SkillCard } from "@/components/skill-card";
import { CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { skills } = await getSkills({ limit: 1000 });

  const username = (session.user as { username?: string }).username;
  const mySkills = username
    ? skills.filter((s) => s.author.toLowerCase() === username.toLowerCase())
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-xl font-medium tracking-tight">Your Skills</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Skills you&apos;ve published to the registry.
      </p>

      {mySkills.length > 0 ? (
        <div className="grid gap-3">
          {mySkills.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <Clock className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            You haven&apos;t published any skills yet.
          </p>
        </div>
      )}
    </div>
  );
}
