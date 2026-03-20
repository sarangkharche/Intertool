"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Key,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface TokenInfo {
  hash: string;
  hash_suffix: string;
  label: string;
  created_at: string;
}

export default function TokensPage() {
  const { status } = useSession();
  const router = useRouter();

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to load tokens");
      const data = await res.json();
      setTokens(data.tokens);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }
    if (status === "authenticated") fetchTokens();
  }, [status, router, fetchTokens]);

  const handleCreate = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setNewToken(data.token);
      setLabel("");
      fetchTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (hash: string) => {
    try {
      const res = await fetch(`/api/tokens/${hash}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Token revoked");
      fetchTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke token");
    }
  };

  const handleCopy = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg text-display">API Tokens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal tokens for CLI and API access. Tokens are shown only once at creation.
        </p>
      </div>

      {/* New token display */}
      {newToken && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Token created. Copy it now; it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs">
              {newToken}
            </code>
            <button onClick={handleCopy} className="btn-ghost shrink-0">
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create token */}
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Token label (e.g. CI, laptop)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="h-8 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !label.trim()}
          className="btn-pill shrink-0"
        >
          {creating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Create
        </button>
      </div>

      {/* Token list */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border-subtle">
        {tokens.map((token) => (
          <div
            key={token.hash}
            className="flex items-center gap-3 px-4 py-3"
          >
            <Key className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{token.label}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">...{token.hash_suffix}</span>
                {" · "}
                {new Date(token.created_at).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={() => handleRevoke(token.hash)}
              className="btn-ghost h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              title="Revoke token"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {tokens.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Key className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No API tokens yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Create a token to use with the CLI or API
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
