import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { intertoolApi } from "@/lib/intertool-api";
import { TokenManager } from "@/components/memory/token-manager";
import { getPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = getPrivatePageMetadata("API tokens");
export const dynamic = "force-dynamic";

export default async function TokensPage() {
  if (!(await auth())?.user) redirect("/sign-in?callbackUrl=/settings/tokens");
  let response: {
    items: Array<{
      id: string;
      name: string;
      token_prefix: string;
      last_used_at: string | null;
      expires_at: string | null;
      revoked_at: string | null;
      created_at: string;
      owner_name: string;
      is_own: boolean;
    }>;
  };
  try {
    response = await intertoolApi("/api/tokens");
  } catch (error) {
    if ((error as { status?: number }).status === 401) redirect("/onboarding");
    throw error;
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8 border-b border-border-subtle pb-6">
        <h1 className="text-lg font-medium tracking-tight">API tokens</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect ChatGPT, Codex, Claude Code, Copilot, Grok, and other MCP
          clients without sharing credentials between engineers.
        </p>
      </div>
      <TokenManager tokens={response.items} />
    </div>
  );
}
