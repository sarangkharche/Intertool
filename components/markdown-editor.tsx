"use client";

import { memo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SkillReadme } from "@/components/skill-readme";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  textareaId?: string;
  ariaLabel?: string;
}

export const MarkdownEditor = memo(function MarkdownEditor({
  value,
  onChange,
  placeholder = "# My Skill\n\nDocumentation...",
  height = 300,
  textareaId,
  ariaLabel,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div>
      <div
        className="mb-1.5 flex gap-1"
        role="tablist"
        aria-label="Markdown editor"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "write"}
          onClick={() => setTab("write")}
          className={`min-h-9 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
            tab === "write"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          onClick={() => setTab("preview")}
          className={`min-h-9 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
            tab === "preview"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview
        </button>
      </div>

      {tab === "write" ? (
        <Textarea
          id={textareaId}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm leading-relaxed resize-y"
          style={{ minHeight: height }}
        />
      ) : (
        <div
          className="overflow-y-auto rounded-lg border border-border/60 p-4"
          style={{ minHeight: height }}
        >
          {value.trim() ? (
            <SkillReadme content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
});
