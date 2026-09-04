"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { CopyCommandButton } from "@/components/copy-command-button";

const clients = [
  {
    id: "claude",
    label: "Claude Code",
    installTarget: "Claude Code",
    configLocation: ".mcp.json",
    verification: "/mcp",
    docsHref: "/docs/getting-started#claude-code",
  },
  {
    id: "codex",
    label: "Codex",
    installTarget: "Codex",
    configLocation: "~/.codex/config.toml",
    verification: "/mcp",
    docsHref: "/docs/getting-started#chatgpt-desktop-and-codex",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    installTarget: "GitHub Copilot",
    configLocation: "~/.copilot/mcp-config.json",
    verification: "copilot mcp list",
    docsHref: "/docs/getting-started#github-copilot",
  },
  {
    id: "grok",
    label: "Grok",
    installTarget: "Grok",
    configLocation: "~/.grok/config.toml",
    verification: "grok mcp doctor intertool",
    docsHref: "/docs/getting-started#grok-and-other-remote-clients",
  },
  {
    id: "other",
    label: "Other MCP client",
    installTarget: "my current MCP client",
    configLocation: "Streamable HTTP",
    verification: "confirm the Intertool tools",
    docsHref: "/docs/getting-started#connect-ai-clients",
  },
] as const;

type ClientId = (typeof clients)[number]["id"];

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

function isClientId(value: string): value is ClientId {
  return clients.some((client) => client.id === value);
}

export function LandingInstallPicker() {
  const [selectedId, setSelectedId] = useState<ClientId>("claude");
  const isInteractive = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState
  );
  const client = clients.find((item) => item.id === selectedId) ?? clients[0];
  const promptLead = `Install the Intertool MCP in ${client.installTarget}. Read and follow the canonical instructions at `;
  const installUrl = "https://intertool.sh/install";
  const installPrompt = `${promptLead}${installUrl}`;

  function selectClient(value: string) {
    if (isClientId(value)) setSelectedId(value);
  }

  return (
    <div
      className="mx-auto w-full max-w-[67.5rem]"
      data-install-picker
      data-interactive={isInteractive ? "true" : "false"}
    >
      <div className="landing-install-shelf group">
        <label className="landing-install-client">
          <span className="sr-only">Select AI client</span>
          <select
            value={selectedId}
            disabled={!isInteractive}
            onChange={(event) => selectClient(event.currentTarget.value)}
            className="focus-ring h-full w-full cursor-pointer appearance-none bg-transparent px-4 pr-10 font-mono text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </label>

        <code className="landing-install-command">
          {promptLead}
          <span className="text-primary">{installUrl}</span>
        </code>

        <CopyCommandButton
          value={installPrompt}
          label="install prompt"
          className="landing-install-copy"
        />
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:gap-4">
        <span aria-live="polite">
          Configure{" "}
          <code className="font-mono text-foreground">
            {client.configLocation}
          </code>
          <span aria-hidden="true"> · </span>
          verify with{" "}
          <code className="font-mono text-foreground">
            {client.verification}
          </code>
        </span>
        <Link
          href={client.docsHref}
          className="focus-ring inline-flex min-h-8 items-center gap-1.5 text-foreground transition-colors hover:text-primary"
        >
          View {client.label} setup
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
