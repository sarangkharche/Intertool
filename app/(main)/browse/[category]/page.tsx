import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { SkillCard } from "@/components/skill-card";
import { getSkills, getCategories } from "@/lib/registry";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { category: categorySlug } = await params;

  const [categories, skills] = await Promise.all([
    getCategories(),
    getSkills({ category: categorySlug }),
  ]);

  const category = categories.find((c) => c.slug === categorySlug);
  if (!category && categories.length > 0) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-xl font-medium tracking-tight">
        {category?.name ?? categorySlug}
      </h1>
      {category?.description && (
        <p className="mb-6 text-muted-foreground">{category.description}</p>
      )}
      {skills.skills.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {skills.skills.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">
            No skills in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
