"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 interactive-ghost"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export function SkillReadme({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn("skill-prose max-w-none", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          pre: ({ children, ...props }) => {
            const codeEl = props.node?.children?.[0];
            const codeText =
              codeEl?.type === "element" && codeEl.tagName === "code"
                ? extractText(codeEl)
                : "";
            return (
              <div className="group relative">
                {codeText && <CopyButton text={codeText} />}
                <pre {...props}>{children}</pre>
              </div>
            );
          },
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              loading="lazy"
              className="max-w-full"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Recursively extract text content from a hast node */
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type: string; value?: string; children?: unknown[] };
  if (n.type === "text" && typeof n.value === "string") return n.value;
  if (Array.isArray(n.children)) return n.children.map(extractText).join("");
  return "";
}
