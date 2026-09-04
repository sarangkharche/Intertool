"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { CopyButton } from "@/components/memory/copy-button";
import { apiErrorMessage } from "@/lib/api-error";
import { StableStatusLabel } from "@/components/ui/stable-status-label";

const config = `{
  "mcpServers": {
    "intertool": {
      "type": "http",
      "url": "\${INTERTOOL_URL:-http://localhost:3001}/mcp",
      "headers": { "Authorization": "Bearer \${INTERTOOL_API_TOKEN}" }
    }
  }
}`;

export function OnboardingFlow({
  hasOrganization,
}: {
  hasOrganization: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(hasOrganization ? 2 : 1);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(endpoint: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/intertool/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(apiErrorMessage(body, "Could not complete this step"));
      return null;
    }
    return body;
  }

  async function createOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = await submit("organizations", {
      name: form.get("name"),
      slug: form.get("slug"),
    });
    if (body) setStep(2);
  }

  async function createRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = await submit("repositories", {
      full_name: form.get("full_name"),
      default_branch: form.get("default_branch"),
    });
    if (body) setStep(3);
  }

  async function createToken() {
    const body = await submit("tokens", { name: "Claude Code · onboarding" });
    if (body) setToken(body.token.token);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div
        className="mb-9 grid grid-cols-3 gap-2"
        aria-label={`Onboarding step ${step} of 3`}
      >
        {["Organisation", "Repository", "Connect"].map((label, index) => (
          <div
            key={label}
            className="border-t pt-2"
            style={{
              borderColor:
                index + 1 <= step ? "var(--foreground)" : "var(--border)",
            }}
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              0{index + 1}
            </span>
            <p className="mt-1 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Step
          title="Create your team space"
          description="This boundary controls who can discover and retrieve each memory."
        >
          <form
            onSubmit={createOrganization}
            className="mt-7 grid gap-5 sm:grid-cols-2"
          >
            <label className="text-xs font-medium">
              Organisation name
              <input
                name="name"
                required
                minLength={2}
                placeholder="Acme"
                className="field-input mt-1.5"
              />
            </label>
            <label className="text-xs font-medium">
              URL slug
              <input
                name="slug"
                required
                minLength={3}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="acme"
                className="field-input mt-1.5 font-mono text-xs"
              />
            </label>
            <Submit busy={busy}>Create organisation</Submit>
          </form>
        </Step>
      )}

      {step === 2 && (
        <Step
          title="Register a repository"
          description="Intertool stores only this namespace and the memories your team approves. It does not read the repository."
        >
          <form
            onSubmit={createRepository}
            className="mt-7 grid gap-5 sm:grid-cols-2"
          >
            <label className="text-xs font-medium sm:col-span-2">
              GitHub repository
              <input
                name="full_name"
                required
                placeholder="owner/repository or GitHub URL"
                className="field-input mt-1.5 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-medium">
              Default branch
              <input
                name="default_branch"
                required
                defaultValue="main"
                className="field-input mt-1.5 font-mono text-xs"
              />
            </label>
            <div className="self-end">
              <Submit busy={busy}>Register repository</Submit>
            </div>
          </form>
        </Step>
      )}

      {step === 3 && (
        <Step
          title="Connect Claude Code"
          description="Create a personal token, keep it local, and add the MCP configuration to your repository."
        >
          {!token ? (
            <button
              onClick={createToken}
              disabled={busy}
              aria-busy={busy || undefined}
              className="btn-pill-lg mt-7 border-foreground bg-foreground text-background hover:bg-foreground/90"
            >
              <KeyRound className="h-4 w-4" />
              <StableStatusLabel
                status={busy ? "pending" : "idle"}
                idle="Create personal token"
                pending="Creating…"
              />
            </button>
          ) : (
            <div className="mt-7 space-y-5">
              <div className="border-l-2 border-success bg-success/5 px-4 py-3">
                <p className="text-sm font-medium">
                  Copy this token now—it will not be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border-subtle bg-background p-2">
                  <code className="min-w-0 flex-1 overflow-x-auto px-1 font-mono text-xs">
                    {token}
                  </code>
                  <CopyButton value={token} label="Copy token" />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium">.mcp.json</p>
                  <CopyButton value={config} label="Copy config" />
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border-subtle bg-muted/35 p-4 text-xs leading-6">
                  <code>{config}</code>
                </pre>
              </div>
              <div className="rounded-md border border-border-subtle px-3 py-2 font-mono text-xs">
                export INTERTOOL_API_TOKEN=&quot;{token}&quot;
              </div>
              <button
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
                className="btn-pill-lg border-foreground bg-foreground text-background hover:bg-foreground/90"
              >
                Open Intertool <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </Step>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Step({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="text-lg font-medium tracking-tight">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children}
    </section>
  );
}

function Submit({ busy, children }: { busy: boolean; children: string }) {
  return (
    <button
      disabled={busy}
      aria-busy={busy || undefined}
      className="btn-pill-lg w-fit border-foreground bg-foreground text-background hover:bg-foreground/90"
    >
      <StableStatusLabel
        status={busy ? "pending" : "idle"}
        idle={children}
        pending="Saving…"
      />
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
