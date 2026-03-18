import { Suspense } from "react";
import { SkillCard } from "@/components/skill-card";
import { FilterSidebar } from "@/components/filter-sidebar";
import { getSkills, getCategories } from "@/lib/registry";
import { SearchFilters, SkillType } from "@/lib/types";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

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

  const [results, categories] = await Promise.all([
    getSkills(filters),
    getCategories(),
  ]);

  const page = filters.page ?? 1;
  const totalPages = Math.ceil(results.total / 20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-xl font-medium tracking-tight">Search</h1>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.skills.map((skill) => (
                  <SkillCard key={skill.slug} skill={skill} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3 text-sm">
                  {page > 1 && (
                    <Link
                      href={`?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Link>
                  )}
                  <span className="text-muted-foreground">
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
