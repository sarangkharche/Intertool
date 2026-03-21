"use client";

import { memo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SkillReadme } from "@/components/skill-readme";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export const MarkdownEditor = memo(function MarkdownEditor({
  value,
  onChange,
  placeholder = "# My Skill\n\nDocumentation...",
  height = 300,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === "write"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
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
