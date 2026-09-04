"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemorySummary, RepositorySummary } from "@/lib/memory-types";
import { StableStatusLabel } from "@/components/ui/stable-status-label";

export function MemoryForm({
  repositories,
  memory,
}: {
  repositories: RepositorySummary[];
  memory?: MemorySummary;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      repository_id: form.get("repository_id") || null,
      type: form.get("type"),
      title: form.get("title"),
      content: form.get("content"),
      confidence: form.get("confidence"),
      paths: String(form.get("paths") ?? "")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      source_url: form.get("source_url") || null,
      source_label: form.get("source_label") || null,
      expires_at: form.get("expires_at")
        ? new Date(String(form.get("expires_at"))).toISOString()
        : null,
    };
    const response = await fetch(
      memory
        ? `/api/intertool/memories/${memory.id}`
        : "/api/intertool/memories",
      {
        method: memory ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not save memory");
      setSaving(false);
      return;
    }
    const id = body.memory.id;
    router.push(`/memories/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="memory-title" label="Title" className="sm:col-span-2">
          <input
            id="memory-title"
            name="title"
            required
            minLength={4}
            maxLength={160}
            defaultValue={memory?.title}
            placeholder="Refund tests require ledger events"
            className="field-input"
          />
        </Field>
        <Field id="memory-type" label="Type">
          <select
            id="memory-type"
            name="type"
            defaultValue={memory?.type ?? "warning"}
            className="field-input"
          >
            {[
              "warning",
              "decision",
              "convention",
              "discovery",
              "ownership",
              "runbook",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field id="memory-confidence" label="Confidence">
          <select
            id="memory-confidence"
            name="confidence"
            defaultValue={memory?.confidence ?? "tentative"}
            className="field-input"
          >
            <option value="tentative">Tentative</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </Field>
        <Field id="memory-repository" label="Repository">
          <select
            id="memory-repository"
            name="repository_id"
            defaultValue={memory?.repository_id ?? ""}
            className="field-input"
          >
            <option value="">Organisation-wide</option>
            {repositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="memory-expiry" label="Expiry (optional)">
          <input
            id="memory-expiry"
            name="expires_at"
            type="datetime-local"
            defaultValue={
              memory?.expires_at ? memory.expires_at.slice(0, 16) : ""
            }
            className="field-input"
          />
        </Field>
        <Field
          id="memory-content"
          label="Memory"
          hint="Share the durable conclusion, not the raw conversation."
          className="sm:col-span-2"
        >
          <textarea
            id="memory-content"
            aria-describedby="memory-content-hint"
            name="content"
            required
            minLength={10}
            maxLength={8000}
            rows={8}
            defaultValue={memory?.content}
            placeholder="Run Redis and set ENABLE_LEDGER_EVENTS=true before refund integration tests."
            className="field-input resize-y leading-6"
          />
        </Field>
        <Field
          id="memory-paths"
          label="Path scopes"
          hint="One repository-relative path or glob per line."
        >
          <textarea
            id="memory-paths"
            aria-describedby="memory-paths-hint"
            name="paths"
            rows={4}
            defaultValue={memory?.paths.join("\n")}
            placeholder={"tests/refunds/**\nsrc/refunds/service.ts"}
            className="field-input font-mono text-[11px]"
          />
        </Field>
        <Field id="memory-tags" label="Tags" hint="Comma-separated.">
          <input
            id="memory-tags"
            aria-describedby="memory-tags-hint"
            name="tags"
            defaultValue={memory?.tags.join(", ")}
            placeholder="tests, redis, refunds"
            className="field-input"
          />
        </Field>
        <Field id="memory-source-label" label="Source label">
          <input
            id="memory-source-label"
            name="source_label"
            defaultValue={memory?.source_label ?? ""}
            placeholder="PR #1842"
            className="field-input"
          />
        </Field>
        <Field id="memory-source-url" label="Source URL" hint="HTTPS only.">
          <input
            id="memory-source-url"
            aria-describedby="memory-source-url-hint"
            name="source_url"
            type="url"
            defaultValue={memory?.source_url ?? ""}
            placeholder="https://github.com/acme/repo/pull/1842"
            className="field-input"
          />
        </Field>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 border-t border-border-subtle pt-5">
        <button
          disabled={saving}
          aria-busy={saving || undefined}
          className="btn-pill border-foreground bg-foreground text-background hover:bg-foreground/90"
        >
          <StableStatusLabel
            status={saving ? "pending" : "idle"}
            idle={memory ? "Save changes" : "Save draft"}
            pending="Saving…"
          />
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
        {!memory && (
          <p className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
            Drafts are private until explicitly published.
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-[11px] text-muted-foreground"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
