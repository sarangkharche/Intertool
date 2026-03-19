"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { NumberedPagination } from "@/components/ui/numbered-pagination";

export function DashboardPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8">
      <NumberedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        paginationItemsToDisplay={5}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
