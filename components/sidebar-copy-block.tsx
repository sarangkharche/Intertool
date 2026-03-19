"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function SidebarCopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded bg-muted p-2">
      <code className="block font-mono text-xs break-all pr-6">{text}</code>
      <button
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity interactive-ghost"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
