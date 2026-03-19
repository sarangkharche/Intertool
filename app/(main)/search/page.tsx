import { Suspense } from "react";
import { SkillCard } from "@/components/skill-card";
import { FilterSidebar } from "@/components/filter-sidebar";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { getSkills, getCategories } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import { PER_PAGE } from "@/lib/constants";
import { Search } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";

  const filters: SearchFilters = {
    query,
    type: params.type as SkillType | undefined,
    category: params.category,
    sort: (params.sort as SearchFilters["sort"]) ?? "newest",
    page: params.page ? Number(params.page) : 1,
  };

  let results: Awaited<ReturnType<typeof getSkills>> = { skills: [], total: 0 };
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [results, categories] = await Promise.all([
      getSkills(filters),
      getCategories(),
    ]);
  } catch (err) {
    console.error("[search] Failed to load data:", err);
  }

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(results.total / PER_PAGE);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-xl text-display">Search</h1>
      {query && (
        <p className="mb-8 text-sm text-muted-foreground">
          {results.total} result{results.total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="flex gap-10">
        <Suspense>
          <FilterSidebar categories={categories} />
        </Suspense>
        <div className="min-w-0 flex-1">
          {results.skills.length > 0 ? (
            <>
              <div className="rounded-lg border border-border/70 divide-y divide-border/70">
                {results.skills.map((skill) => (
                  <SkillCard key={skill.slug} skill={skill} variant="list" />
                ))}
              </div>
              <Suspense>
                <DashboardPagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            </>
          ) : (
            <div className="py-16 text-center">
              <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {query ? "Nothing found." : "Type something to search."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
