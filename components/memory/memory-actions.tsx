"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryStatus } from "@/lib/memory-types";
import { StableStatusLabel } from "@/components/ui/stable-status-label";

export function MemoryActions({
  id,
  title,
  status,
  canManage,
  canDispute,
}: {
  id: string;
  title: string;
  status: MemoryStatus;
  canManage: boolean;
  canDispute: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function transition(action: "publish" | "dispute" | "archive") {
    const prompts = {
      publish: `Publish the exact draft “${title}” for everyone in this organisation?`,
      dispute: `Mark “${title}” as disputed and remove it from retrieval?`,
      archive: `Archive “${title}” and remove it from retrieval?`,
    };
    if (!window.confirm(prompts[action])) return;
    setBusy(action);
    setError("");
    const response = await fetch(`/api/intertool/memories/${id}/${action}`, {
      method: "POST",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? `Could not ${action} memory`);
      setBusy(null);
      return;
    }
    router.refresh();
    setBusy(null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canManage && status === "draft" && (
          <button
            onClick={() => transition("publish")}
            disabled={!!busy}
            aria-busy={busy === "publish" || undefined}
            className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
          >
            <StableStatusLabel
              status={busy === "publish" ? "pending" : "idle"}
              idle="Publish memory"
              pending="Publishing…"
            />
          </button>
        )}
        {canDispute && status === "published" && (
          <button
            onClick={() => transition("dispute")}
            disabled={!!busy}
            className="btn-pill"
          >
            Mark disputed
          </button>
        )}
        {canManage && status !== "archived" && (
          <button
            onClick={() => transition("archive")}
            disabled={!!busy}
            className="btn-ghost text-destructive hover:text-destructive"
          >
            Archive
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReportMemory({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/intertool/memories/${id}/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason: form.get("reason"),
        comment: form.get("comment"),
      }),
    });
    if (response.ok) {
      setMessage(
        "Report recorded. The memory remains visible until an admin reviews it."
      );
      setOpen(false);
      router.refresh();
    } else {
      const body = await response.json().catch(() => null);
      setMessage(body?.error?.message ?? "Could not record report");
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          Report stale or incorrect
        </button>
        {message && (
          <p role="status" className="mt-2 text-[11px] text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-3 rounded-md border border-border-subtle bg-muted/20 p-3"
    >
      <label className="block text-xs font-medium">
        Reason
        <select name="reason" className="field-input mt-1.5">
          {[
            "stale",
            "incorrect",
            "conflicting",
            "secret_or_sensitive",
            "other",
          ].map((reason) => (
            <option key={reason}>{reason}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        What changed?
        <textarea
          name="comment"
          required
          minLength={3}
          rows={3}
          className="field-input mt-1.5"
        />
      </label>
      <div className="flex gap-2">
        <button className="btn-pill">Submit report</button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ResolveReport({
  memoryId,
  reportId,
}: {
  memoryId: string;
  reportId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resolve() {
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/intertool/memories/${memoryId}/reports/${reportId}/resolve`,
      { method: "POST" }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not resolve report");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={resolve}
        className="mt-2 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
      >
        <StableStatusLabel
          status={busy ? "pending" : "idle"}
          idle="Mark resolved"
          pending="Resolving…"
        />
      </button>
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
