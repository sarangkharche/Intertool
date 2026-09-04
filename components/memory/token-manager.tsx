"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Braces,
  Github,
  KeyRound,
  MessageSquare,
  TerminalSquare,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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

const sharedMcpConfig = `{
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

const agentInstallPrompt =
  "Install the Intertool MCP for me. Read and follow the canonical instructions at https://intertool.sh/install";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  format: string;
  config: string;
  note: React.ReactNode;
}

const integrations: Integration[] = [
  {
    id: "codex",
    name: "ChatGPT + Codex",
    description:
      "One local config shared by the ChatGPT app, Codex CLI, and IDE extension.",
    icon: Bot,
    format: "~/.codex/config.toml",
    config: `[mcp_servers.intertool]
url = "http://localhost:3001/mcp"
bearer_token_env_var = "INTERTOOL_API_TOKEN"`,
    note: (
      <>
        Restart the app or extension, then use <code>/mcp</code> to confirm
        Intertool is connected.
      </>
    ),
  },
  {
    id: "claude",
    name: "Claude Code",
    description: "Use a project-level MCP file so each repository can opt in.",
    icon: TerminalSquare,
    format: ".mcp.json",
    config: sharedMcpConfig,
    note: (
      <>
        Run <code>/mcp</code> in Claude Code to inspect the connection.
      </>
    ),
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    description:
      "Connect Copilot CLI locally or add the same server to a repository.",
    icon: Github,
    format: "Terminal",
    config: `copilot mcp add --transport http \\
  --header "Authorization: Bearer $INTERTOOL_API_TOKEN" \\
  intertool http://localhost:3001/mcp`,
    note: (
      <>
        For Copilot cloud agent, add an Agents secret named
        <code> COPILOT_MCP_INTERTOOL_TOKEN</code> and configure the remote MCP
        server in repository settings.
      </>
    ),
  },
  {
    id: "grok",
    name: "Grok",
    description:
      "Connect the Grok CLI locally, or use a custom connector for Grok Bot.",
    icon: MessageSquare,
    format: "Terminal",
    config: `grok mcp add --transport http \\
  intertool http://localhost:3001/mcp \\
  --header "Authorization: Bearer \${INTERTOOL_API_TOKEN}"`,
    note: (
      <>
        Grok Bot and cloud connectors cannot reach localhost. Give the custom
        connector a deployed HTTPS Intertool URL or a secure tunnel instead.
      </>
    ),
  },
  {
    id: "other",
    name: "Other MCP client",
    description:
      "Use any client that supports Streamable HTTP and bearer authentication.",
    icon: Braces,
    format: "Generic JSON",
    config: sharedMcpConfig,
    note: (
      <>
        Point the client at <code>/mcp</code> and send the token as an
        <code> Authorization: Bearer</code> header.
      </>
    ),
  },
];

export function TokenManager({ tokens }: { tokens: TokenMetadata[] }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState(
    integrations[0].id
  );
  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0];

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
        `Revoke “${token.name}”? Any connected agent using it will receive 401.`
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
        <div className="grid gap-5 border-b border-border-subtle pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] lg:items-end">
          <div className="max-w-2xl">
            <h2 className="text-sm font-medium">Install with your agent</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Paste one prompt into Codex, Claude Code, Copilot, or Grok. The
              agent will preserve your existing MCP servers and verify the
              connection.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-muted/35 px-3 py-2.5">
            <code className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px]">
              Install the Intertool MCP for me — intertool.sh/install
            </code>
            <CopyButton value={agentInstallPrompt} label="Copy prompt" />
          </div>
        </div>

        <div className="mt-7 max-w-2xl">
          <h2 className="text-sm font-medium">Or configure it manually</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Intertool is a Streamable HTTP MCP server. Choose a client for its
            exact setup format.
          </p>
        </div>

        <div
          className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-5"
          role="tablist"
          aria-label="AI tool integrations"
        >
          {integrations.map((item) => {
            const Icon = item.icon;
            const active = item.id === integration.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`integration-tab-${item.id}`}
                aria-selected={active}
                aria-controls={`integration-panel-${item.id}`}
                onClick={() => setActiveIntegration(item.id)}
                className={`flex min-h-16 items-center gap-3 bg-surface px-3 py-3 text-left transition-colors focus-ring ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-brand" : ""}`}
                />
                <span className="text-xs font-medium leading-4">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="mt-6"
          role="tabpanel"
          id={`integration-panel-${integration.id}`}
          aria-labelledby={`integration-tab-${integration.id}`}
          tabIndex={0}
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">{integration.name}</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                {integration.description} <code>{integration.format}</code>
              </p>
            </div>
            <CopyButton value={integration.config} label="Copy setup" />
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-muted/35 p-4 text-xs leading-6">
            <code>{integration.config}</code>
          </pre>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {integration.note}
          </p>
        </div>

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
          Create a separate token for each client so it can be revoked without
          interrupting the others. Never commit a token.
        </p>
      </section>
    </div>
  );
}
