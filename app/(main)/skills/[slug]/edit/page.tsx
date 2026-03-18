import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSkillBySlug, getCategories } from "@/lib/registry";
import { EditSkillForm } from "@/components/edit-skill-form";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { slug } = await params;
  const skill = await getSkillBySlug(slug);
  if (!skill) notFound();

  const username = (session.user as { username?: string }).username;
  if (!username || skill.author.toLowerCase() !== username.toLowerCase()) {
    redirect(`/skills/${slug}`);
  }

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-xl font-medium tracking-tight">
        Edit: {skill.name}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Update your skill. Changes are versioned automatically.
      </p>
      <EditSkillForm skill={skill} categories={categories} />
    </div>
  );
}
