"use client";

import { useState, useEffect, useRef } from "react";
import { Package, Check, X, Loader2, ArrowRight } from "lucide-react";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function CreateOrgPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugReason, setSlugReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [domain, setDomain] = useState("intertool.sh");

  useEffect(() => {
    setDomain(window.location.hostname.replace(/^(www\.)?/, ""));
  }, []);

  // Auto-derive slug from name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Debounced slug availability check
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSlugStatus("checking");
      fetch(`/api/orgs/check?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error("check failed");
          return r.json();
        })
        .then((data: { available: boolean; reason?: string }) => {
          setSlugStatus(data.available ? "available" : "taken");
          setSlugReason(data.reason || "");
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            setSlugStatus("idle");
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create organization");
        setSubmitting(false);
        return;
      }

      // Redirect to subdomain settings
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const baseDomain = window.location.hostname.replace(/^(www\.)?/, "");
      window.location.href = `${protocol}//${slug}.${baseDomain}${port}/settings`;
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim() && slug.length >= 3 && slugStatus === "available" && !submitting;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="text-center">
          <h1 className="mb-1 text-lg font-medium tracking-tight">
            Create your registry
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Set up a private space for your team's AI tools.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Org name */}
          <div>
            <label htmlFor="org-name" className="mb-1.5 block text-xs font-medium text-foreground">
              Organization name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
              autoFocus
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="org-slug" className="mb-1.5 block text-xs font-medium text-foreground">
              Registry URL
            </label>
            <div className="flex items-center gap-0">
              <input
                id="org-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="acme"
                className="w-full rounded-l-md border border-r-0 border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                required
              />
              <span className="inline-flex items-center rounded-r-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                .{domain}
              </span>
            </div>

            {/* Status indicator */}
            <div className="mt-1.5 h-4">
              {slugStatus === "checking" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                </span>
              )}
              {slugStatus === "available" && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check className="h-3 w-3" /> Available
                </span>
              )}
              {slugStatus === "taken" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <X className="h-3 w-3" /> {slugReason || "Not available"}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-pill-lg w-full justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create registry
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/50">
          You'll configure your S3 storage on the next step.
        </p>
      </div>
    </div>
  );
}
