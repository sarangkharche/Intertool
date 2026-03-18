"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, ArrowLeft } from "lucide-react";
import { Skill, Category, SkillType } from "@/lib/types";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { MarkdownEditor } from "@/components/markdown-editor";
import { toast } from "sonner";
import Link from "next/link";

const SKILL_TYPES: SkillType[] = [
  "skill",
  "mcp-server",
  "agent-tool",
  "prompt-template",
];

export function EditSkillForm({
  skill,
  categories,
}: {
  skill: Skill;
  categories: Category[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.description);
  const [readme, setReadme] = useState(skill.readme);
  const [category, setCategory] = useState(skill.category_slug);
  const [type, setType] = useState<SkillType>(skill.type);
  const [tags, setTags] = useState<string[]>(skill.tags);
  const [tagInput, setTagInput] = useState("");
  const [compatibility, setCompatibility] = useState<string[]>(
    skill.compatibility
  );
  const [sourceUrl, setSourceUrl] = useState(skill.source_url ?? "");
  const [changelog, setChangelog] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!name || !description || !category) {
      toast.error("Name, description, and category are required");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", skill.slug);
      formData.append("type", type);
      formData.append("description", description);
      formData.append("readme", readme);
      formData.append("category", category);
      formData.append("tags", JSON.stringify(tags));
      formData.append("compatibility", JSON.stringify(compatibility));
      if (sourceUrl) formData.append("source_url", sourceUrl);
      if (skill.source_format) formData.append("source_format", skill.source_format);
      if (skill.transport) formData.append("transport", skill.transport);
      if (changelog) formData.append("changelog", changelog);

      const res = await fetch("/api/publish", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      toast.success("Skill updated");
      router.push(`/skills/${skill.slug}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Version info */}
      <div className="rounded-md bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Current version: <span className="font-mono font-medium text-foreground">v{skill.version || "1.0.0"}</span>
          {" · "}Saving will create <span className="font-mono font-medium text-foreground">v{bumpDisplay(skill.version || "1.0.0")}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as SkillType)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {SKILL_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">README</label>
        <MarkdownEditor
          value={readme}
          onChange={setReadme}
          height={300}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Category</label>
        <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Tags</label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="h-8 text-sm"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs font-normal">
                {tag}
                <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Works with</label>
        <div className="flex flex-wrap gap-1.5">
          {["Claude Code", "Cursor", "VS Code", "Windsurf", "CLI"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setCompatibility((prev) =>
                    prev.includes(item)
                      ? prev.filter((c) => c !== item)
                      : [...prev, item]
                  )
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  compatibility.includes(item)
                    ? "border-foreground/20 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/10"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Source URL</label>
        <Input
          placeholder="https://github.com/..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="h-8 font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          Changelog <span className="text-muted-foreground/60">(what changed?)</span>
        </label>
        <Input
          placeholder="Fixed bug in prompt template..."
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-5">
        <Link
          href={`/skills/${skill.slug}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading || !name || !description || !category}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </div>
    </div>
  );
}

function bumpDisplay(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.1";
  parts[2]++;
  return parts.join(".");
}
