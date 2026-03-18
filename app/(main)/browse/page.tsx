import { redirect } from "next/navigation";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.category) qs.set("category", params.category);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", params.page);
  const query = qs.toString();
  redirect(query ? `/dashboard?${query}` : "/dashboard");
}
