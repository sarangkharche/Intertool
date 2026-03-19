import { Package } from "lucide-react";
import { GITHUB_URL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3" aria-hidden="true" />
          <span>Intertool</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
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
