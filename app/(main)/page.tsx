import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Package, ArrowRight, Database, Shield, Zap } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  // Signed-in users go straight to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-24 text-center sm:py-32">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
          <Package className="h-3 w-3" />
          Internal AI registry
        </div>
        <h1 className="mb-4 text-3xl font-medium tracking-tight sm:text-4xl">
          Your team&apos;s AI toolbox
        </h1>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          A private registry for your organization. Share skills, MCP servers,
          agents, and prompt templates securely across your team.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="btn-pill-lg"
          >
            Sign in with GitHub
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/60">
          Admin sets up the org. Team members sign in and share.
        </p>
      </section>

      {/* Value props */}
      <section className="border-t border-border-subtle pb-20 pt-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <Database className="mx-auto mb-3 h-5 w-5 text-muted-foreground/70" />
            <p className="mb-1 text-sm font-medium">Your storage</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Skills live in your own S3 bucket. No data leaves your
              infrastructure.
            </p>
          </div>
          <div className="text-center">
            <Shield className="mx-auto mb-3 h-5 w-5 text-muted-foreground/70" />
            <p className="mb-1 text-sm font-medium">Org-scoped access</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              GitHub OAuth for auth. Only your team members can browse and
              publish.
            </p>
          </div>
          <div className="text-center">
            <Zap className="mx-auto mb-3 h-5 w-5 text-muted-foreground/70" />
            <p className="mb-1 text-sm font-medium">One-line install</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Every skill gets install commands for Claude Code, Cursor, and
              your CLI.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
