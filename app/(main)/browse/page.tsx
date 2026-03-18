import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SkillCard } from "@/components/skill-card";
import { FilterSidebar } from "@/components/filter-sidebar";
import { getSkills, getCategories } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const params = await searchParams;
  const filters: SearchFilters = {
    type: params.type as SkillType | undefined,
    category: params.category,
    author: params.author,
    sort: (params.sort as SearchFilters["sort"]) ?? "newest",
    page: params.page ? Number(params.page) : 1,
  };

  const [skills, categories] = await Promise.all([
    getSkills(filters),
    getCategories(),
  ]);

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(skills.total / 20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-medium tracking-tight">Browse Registry</h1>
        <span className="font-mono text-xs text-muted-foreground">
          {skills.total} result{skills.total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mb-6">
        <Suspense>
          <FilterSidebar categories={categories} />
        </Suspense>
      </div>
      <div>
          {skills.skills.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {skills.skills.map((skill) => (
                  <SkillCard key={skill.slug} skill={skill} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                  {page > 1 && (
                    <Link
                      href={`?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Link>
                  )}
                  <span className="font-mono text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">
                No skills match your filters.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
