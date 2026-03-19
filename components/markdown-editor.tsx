"use client";

import { memo } from "react";
import { Textarea } from "@/components/ui/textarea";

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
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="font-mono text-sm leading-relaxed resize-y"
      style={{ minHeight: height }}
    />
  );
});
