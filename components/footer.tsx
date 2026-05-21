import Link from "next/link";
import { Package } from "lucide-react";
import { GITHUB_URL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3" aria-hidden="true" />
          <span>Intertool</span>
        </div>
        <div className="-mx-2 flex items-center gap-1 text-xs text-muted-foreground sm:gap-2">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center rounded-md px-3 transition-colors hover:text-foreground focus-ring"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="inline-flex min-h-11 items-center rounded-md px-3 transition-colors hover:text-foreground focus-ring"
          >
            Docs
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md px-3 transition-colors hover:text-foreground focus-ring"
          >
            GitHub
          </a>
          <span className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
            v0.1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
