"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteSkillButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete");
        setDeleting(false);
        setConfirming(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-pill !border-red-500/40 !bg-red-500/10 !text-red-400 hover:!bg-red-500/20"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground interactive-ghost hover:text-red-400"
      aria-label="Delete"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
