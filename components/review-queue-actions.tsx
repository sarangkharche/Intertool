"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReviewQueueActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<
    "published" | "archived" | null
  >(null);

  const updateStatus = async (status: "published" | "archived") => {
    setLoadingAction(status);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to update item");
      }
      toast.success(status === "published" ? "Item approved" : "Item archived");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => updateStatus("archived")}
        disabled={loadingAction !== null}
        className="btn-ghost"
      >
        {loadingAction === "archived" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Archive className="h-3 w-3" />
        )}
        Archive
      </button>
      <button
        type="button"
        onClick={() => updateStatus("published")}
        disabled={loadingAction !== null}
        className="btn-pill"
      >
        {loadingAction === "published" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Approve
      </button>
    </div>
  );
}
