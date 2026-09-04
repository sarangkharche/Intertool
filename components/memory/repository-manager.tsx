"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Trash2 } from "lucide-react";
import { apiErrorMessage } from "@/lib/api-error";
import type { RepositorySummary } from "@/lib/memory-types";
import { formatDate } from "@/lib/memory-types";
import { StableStatusLabel } from "@/components/ui/stable-status-label";

export function RepositoryManager({
  repositories,
  canManage,
}: {
  repositories: RepositorySummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/intertool/repositories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        default_branch: form.get("default_branch"),
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(apiErrorMessage(body, "Could not register repository"));
      setBusy(false);
      return;
    }
    event.currentTarget.reset();
    setBusy(false);
    router.refresh();
  }

  async function remove(repository: RepositorySummary) {
    if (
      !window.confirm(
        `Remove ${repository.full_name}? Existing memories become organisation-wide.`
      )
    )
      return;
    const response = await fetch(
      `/api/intertool/repositories/${repository.id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not remove repository");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
        {repositories.length ? (
          <div className="divide-y divide-border-subtle">
            {repositories.map((repository) => (
              <div
                key={repository.id}
                className="flex items-center gap-3 px-4 py-4"
              >
                <BookOpen
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium">
                    {repository.full_name}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Default branch {repository.default_branch} · added{" "}
                    {formatDate(repository.created_at)}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => remove(repository)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/5 hover:text-destructive focus-ring"
                    aria-label={`Remove ${repository.full_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <BookOpen className="mb-3 h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-medium">No repositories registered</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Register one by its GitHub owner/repository name.
            </p>
          </div>
        )}
      </div>
      <aside className="border-t-2 border-foreground pt-4">
        <h2 className="text-sm font-medium">Register repository</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Intertool stores the name and context scope only. It does not clone or
          read the repository.
        </p>
        {canManage ? (
          <form onSubmit={create} className="mt-5 space-y-4">
            <label className="block text-xs font-medium">
              GitHub repository
              <input
                name="full_name"
                required
                placeholder="owner/repository or GitHub URL"
                className="field-input mt-1.5 font-mono text-xs"
              />
            </label>
            <label className="block text-xs font-medium">
              Default branch
              <input
                name="default_branch"
                required
                defaultValue="main"
                className="field-input mt-1.5 font-mono text-xs"
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              aria-busy={busy || undefined}
              className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
            >
              <StableStatusLabel
                status={busy ? "pending" : "idle"}
                idle="Register"
                pending="Registering…"
              />
            </button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            An owner or admin can add repositories.
          </p>
        )}
      </aside>
    </div>
  );
}
