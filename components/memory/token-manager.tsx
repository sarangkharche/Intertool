"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/memory/copy-button";
import { StableStatusLabel } from "@/components/ui/stable-status-label";
import { formatDate } from "@/lib/memory-types";

interface TokenMetadata {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  owner_name: string;
  is_own: boolean;
}

const mcpConfig = `{
  "mcpServers": {
    "intertool": {
      "type": "http",
      "url": "\${INTERTOOL_URL:-http://localhost:3001}/mcp",
      "headers": {
        "Authorization": "Bearer \${INTERTOOL_API_TOKEN}"
      }
    }
  }
}`;

export function TokenManager({ tokens }: { tokens: TokenMetadata[] }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/intertool/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name") }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not create token");
      setBusy(false);
      return;
    }
    setRevealed(body.token.token);
    event.currentTarget.reset();
    setBusy(false);
    router.refresh();
  }

  async function revoke(token: TokenMetadata) {
    if (
      !window.confirm(
        `Revoke “${token.name}”? Any connected Claude session using it will receive 401.`
      )
    )
      return;
    const response = await fetch(`/api/intertool/tokens/${token.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not revoke token");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-9">
      {revealed && (
        <section
          className="border-l-2 border-success bg-success/5 px-4 py-3"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Copy this token now</p>
              <p className="mt-1 text-xs text-muted-foreground">
                It will never be shown again.
              </p>
            </div>
            <CopyButton value={revealed} label="Copy token" />
          </div>
          <code className="mt-3 block overflow-x-auto rounded-md border border-border-subtle bg-background p-3 font-mono text-xs">
            {revealed}
          </code>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <h2 className="mb-3 text-sm font-medium">Personal access tokens</h2>
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
            {tokens.length ? (
              <div className="divide-y divide-border-subtle">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center gap-3 px-4 py-4"
                  >
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{token.name}</p>
                        {token.revoked_at && (
                          <span className="text-[10px] text-destructive">
                            revoked
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        itk_{token.token_prefix}_•••• · {token.owner_name} ·
                        last used {formatDate(token.last_used_at)}
                      </p>
                    </div>
                    {!token.revoked_at && (
                      <button
                        onClick={() => revoke(token)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/5 hover:text-destructive focus-ring"
                        aria-label={`Revoke ${token.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium">No API tokens</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create one for each engineer or machine.
                </p>
              </div>
            )}
          </div>
        </section>
        <aside className="border-t-2 border-foreground pt-4">
          <h2 className="text-sm font-medium">Create token</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Use a descriptive device or client name. Tokens are hashed before
            storage.
          </p>
          <form onSubmit={create} className="mt-5 space-y-4">
            <label className="block text-xs font-medium">
              Token name
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Alice · MacBook"
                className="field-input mt-1.5"
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
                idle="Create token"
                pending="Creating…"
              />
            </button>
          </form>
        </aside>
      </div>

      <section className="border-t border-border-subtle pt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Connect Claude Code</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Save this as <code>.mcp.json</code> in the repository.
            </p>
          </div>
          <CopyButton value={mcpConfig} label="Copy config" />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-muted/35 p-4 text-xs leading-6">
          <code>{mcpConfig}</code>
        </pre>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border-subtle px-3 py-2">
          <code className="overflow-x-auto font-mono text-xs">
            export INTERTOOL_API_TOKEN=&quot;itk_...&quot;
          </code>
          <CopyButton
            value={'export INTERTOOL_API_TOKEN="itk_..."'}
            label="Copy"
          />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Run <code className="font-mono">/mcp</code> in Claude Code to verify
          the connection. Never commit the token.
        </p>
      </section>
    </div>
  );
}
