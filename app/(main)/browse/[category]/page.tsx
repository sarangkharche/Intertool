import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("Browse category");

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  redirect(`/dashboard?category=${encodeURIComponent(category)}`);
}
