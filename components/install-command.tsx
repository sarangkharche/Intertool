"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary px-4 py-3">
      <span className="select-none font-mono text-sm text-muted-foreground">$</span>
      <code className="flex-1 font-mono text-sm text-foreground">{command}</code>
      <button
        onClick={handleCopy}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground interactive-ghost"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
