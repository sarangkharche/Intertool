"use client";

import { useState, useRef, useCallback } from "react";
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
import {
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  FileArchive,
  Check,
  Link as LinkIcon,
  PenLine,
  Sparkles,
  Zap,
  Terminal,
  Bot,
} from "lucide-react";
import { SkillType, Category, SourceFormat, McpTransport } from "@/lib/types";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { MarkdownEditor } from "@/components/markdown-editor";
import { toast } from "sonner";

const MANUAL_STEPS_FULL = ["Type", "Files", "Details", "Review"];
const MANUAL_STEPS_SHORT = ["Files", "Details", "Review"];
const QUICK_STEPS = ["Upload", "Review & Edit", "Submit"];
const SKILL_TYPES: SkillType[] = [
  "skill",
  "mcp-server",
  "agent-tool",
  "prompt-template",
];

type WizardMode = "choose" | "quick" | "manual";

export function PublishWizard({
  categories,
  preselectedType,
}: {
  categories: Category[];
  preselectedType?: SkillType;
}) {
  const [mode, setMode] = useState<WizardMode>("choose");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // Shared form state
  const [type, setType] = useState<SkillType>(preselectedType ?? "skill");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [readme, setReadme] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [compatibility, setCompatibility] = useState<string[]>([]);

  // Source tracking
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFormat, setSourceFormat] = useState<SourceFormat | "">("");
  const [transport, setTransport] = useState<McpTransport | "">("");

  // File uploads
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [readmeFromFile, setReadmeFromFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick share — GitHub URL
  const [githubUrl, setGithubUrl] = useState("");

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleReadmeChange = useCallback((val: string) => {
    setReadme(val);
    setReadmeFromFile(false);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  /** Detect SKILL.md frontmatter from file content */
  const detectSkillMd = useCallback(
    (content: string): boolean => {
      const match = content.match(
        /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
      );
      if (!match) return false;

      try {
        // Dynamic import not needed — parse YAML frontmatter inline
        const lines = match[1].split("\n");
        const fm: Record<string, string> = {};
        for (const line of lines) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
            fm[key] = val;
          }
        }

        if (fm.name && fm.description) {
          handleNameChange(fm.name);
          setDescription(fm.description);
          setReadme(match[2]);
          setReadmeFromFile(true);
          setSourceFormat("skill-md");

          if (fm.type && SKILL_TYPES.includes(fm.type as SkillType)) {
            setType(fm.type as SkillType);
          }

          toast.success("SKILL.md detected — fields auto-populated");
          return true;
        }
      } catch {
        // Not valid frontmatter
      }
      return false;
    },
    []
  );

  /** Detect server.json content */
  const detectServerJson = useCallback((content: string): boolean => {
    try {
      const data = JSON.parse(content) as Record<string, unknown>;
      if (data.name && data.description) {
        handleNameChange(data.name as string);
        setDescription(data.description as string);
        setType("mcp-server");
        setSourceFormat("server-json");

        if (data.transport) {
          const t = data.transport as Record<string, unknown>;
          if (t.type === "stdio" || t.type === "sse" || t.type === "streamable-http") {
            setTransport(t.type as McpTransport);
          }
        }

        setCompatibility(["Claude Code", "Cursor"]);
        toast.success("server.json detected — MCP server fields populated");
        return true;
      }
    } catch {
      // Not valid JSON
    }
    return false;
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      const ext = file.name.toLowerCase().split(".").pop();
      if (!["md", "zip", "yaml", "yml", "json", "txt"].includes(ext ?? "")) {
        toast.error(`Unsupported file type: .${ext}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        continue;
      }

      // Auto-detect formats
      if (file.name.toLowerCase() === "skill.md" || ext === "md") {
        const text = await file.text();
        const isSkillMd = detectSkillMd(text);
        if (!isSkillMd && ext === "md") {
          setReadme(text);
          setReadmeFromFile(true);
        }
      } else if (file.name.toLowerCase() === "server.json") {
        const text = await file.text();
        detectServerJson(text);
      }

      if (ext === "zip") {
        setSourceFormat("zip");
      }

      setUploadedFiles((prev) => {
        const filtered = prev.filter((f) => f.name !== file.name);
        return [...filtered, file];
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
    if (readmeFromFile && fileName.toLowerCase().endsWith(".md")) {
      setReadme("");
      setReadmeFromFile(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "zip") return <FileArchive className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** Import from GitHub URL */
  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      const data = await res.json();
      handleNameChange(data.name);
      if (data.slug) setSlug(data.slug);
      setType(data.type);
      setDescription(data.description);
      setReadme(data.readme || "");
      setTags(data.tags || []);
      setCompatibility(data.compatibility || []);
      setSourceUrl(data.source_url);
      setSourceFormat(data.source_format);
      if (data.transport) setTransport(data.transport);

      toast.success(`Imported from ${data.source_format.replace("-", " ")}`);
      setStep(1); // Move to review/edit
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  /** Handle quick-share file drop → always advance to review/edit */
  const handleQuickFileDrop = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    await handleFileSelect(e);
    // Always advance — user can fill in remaining fields on next step
    setStep(1);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("type", type);
      formData.append("description", description);
      formData.append("readme", readme);
      formData.append("category", category);
      formData.append("tags", JSON.stringify(tags));
      formData.append("compatibility", JSON.stringify(compatibility));
      if (sourceUrl) formData.append("source_url", sourceUrl);
      if (sourceFormat) formData.append("source_format", sourceFormat);
      if (transport) formData.append("transport", transport);

      for (const file of uploadedFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/publish", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        const details = err.details as { field: string; message: string }[] | undefined;
        const msg = details?.length
          ? details.map((d) => `${d.field}: ${d.message}`).join("; ")
          : err.error || "Failed to publish";
        throw new Error(msg);
      }

      const data = await res.json();
      setPublishedSlug(data.slug);
      toast.success("Skill published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (publishedSlug) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border p-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
          <Check className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Published</p>
          <p className="text-sm text-muted-foreground">
            Your skill is now live in the registry.
          </p>
        </div>
        <a
          href={`/skills/${publishedSlug}`}
          className="text-sm font-medium underline"
        >
          View skill page
        </a>
      </div>
    );
  }

  // ── Type chooser ──
  if (mode === "choose") {
    const typeOptions: { type: SkillType; icon: React.ReactNode; color: string; desc: string }[] = [
      { type: "skill", icon: <Zap className="h-5 w-5" />, color: "text-muted-foreground", desc: "Claude Code skills, reusable prompts" },
      { type: "mcp-server", icon: <Terminal className="h-5 w-5" />, color: "text-muted-foreground", desc: "Model Context Protocol servers" },
      { type: "agent-tool", icon: <Bot className="h-5 w-5" />, color: "text-muted-foreground", desc: "Standalone agent tools" },
      { type: "prompt-template", icon: <FileText className="h-5 w-5" />, color: "text-muted-foreground", desc: "Reusable prompt templates" },
    ];

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          What are you publishing?
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                setType(opt.type);
                setMode("quick");
                setStep(0);
              }}
              className="group rounded-lg border border-border p-5 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30"
            >
              <div className={`mb-3 ${opt.color}`}>
                {opt.icon}
              </div>
              <p className="mb-1 text-sm font-medium">
                {SKILL_TYPE_LABELS[opt.type]}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <button
            onClick={() => {
              setMode("manual");
              setStep(0);
            }}
            className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <PenLine className="h-3 w-3" />
            Or fill in manually step by step
          </button>
        </div>
      </div>
    );
  }

  // ── Quick Share flow ──
  if (mode === "quick") {
    const steps = QUICK_STEPS;

    return (
      <div>
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={() => {
              setMode("choose");
              setStep(0);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            &larr;
          </button>
          {steps.map((s, i) => (
            <span key={s} className={i <= step ? "text-foreground" : ""}>
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {/* Quick Step 0: Import */}
        {step === 0 && (
          <div className="space-y-5">
            {/* GitHub URL */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                GitHub URL
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGitHubImport();
                    }
                  }}
                  className="h-9 font-mono text-sm"
                />
                <button
                  onClick={handleGitHubImport}
                  disabled={importing || !githubUrl.trim()}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  Import
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                We&apos;ll look for SKILL.md, skill.yaml, or server.json in the
                repo
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* File drop */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add(
                  "border-primary/50",
                  "bg-primary/5"
                );
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove(
                  "border-primary/50",
                  "bg-primary/5"
                );
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove(
                  "border-primary/50",
                  "bg-primary/5"
                );
                if (e.dataTransfer.files.length > 0) {
                  const event = {
                    target: { files: e.dataTransfer.files },
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleQuickFileDrop(event);
                }
              }}
              className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-muted-foreground/30"
            >
              <Upload className="mx-auto mb-3 h-6 w-6 text-muted-foreground/40" />
              <p className="mb-1 text-sm font-medium">
                Drop a file to auto-detect
              </p>
              <p className="text-xs text-muted-foreground">
                SKILL.md, server.json, skill.yaml, or .zip
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.zip,.yaml,.yml,.json,.txt"
                onChange={handleQuickFileDrop}
                className="hidden"
              />
            </div>

            {/* Uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {getFileIcon(file.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

              </div>
            )}
          </div>
        )}

        {/* Quick Step 1: Review & Edit */}
        {step === 1 && (
          <div className="space-y-4">
            {sourceFormat && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Auto-populated from{" "}
                <span className="font-mono">
                  {sourceFormat.replace("-", " ")}
                </span>
                {sourceUrl && (
                  <>
                    {" — "}
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      source
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  placeholder="My Skill"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Slug</label>
                <Input
                  placeholder="my-skill"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="h-8 font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as SkillType)}
                >
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
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v ?? "")}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="What does this do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            {type === "mcp-server" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Transport
                </label>
                <Select
                  value={transport}
                  onValueChange={(v) => setTransport(v as McpTransport)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select transport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">stdio</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                    <SelectItem value="streamable-http">
                      Streamable HTTP
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tags</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  className="h-8 text-sm"
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 text-xs font-normal"
                    >
                      {tag}
                      <button
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Works with
              </label>
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
          </div>
        )}

        {/* Quick Step 2: Submit (same as manual review) */}
        {step === 2 && <ReviewPanel {...{
          type, name, slug, category, description, sourceUrl, sourceFormat,
          transport, uploadedFiles,
        }} />}

        {/* Nav */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() =>
              step === 0
                ? setMode("choose")
                : setStep(step - 1)
            }
            className="btn-ghost"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!name || !description || !category)}
              className="btn-pill"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-pill"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Publish
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Manual flow ──
  const manualSteps = preselectedType ? MANUAL_STEPS_SHORT : MANUAL_STEPS_FULL;
  // When type is preselected, step 0 = Files (not Type), so offset the step index
  const effectiveStep = preselectedType ? step + 1 : step;

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
        <button
          onClick={() => {
            setMode("choose");
            setStep(0);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          &larr;
        </button>
        {manualSteps.map((s, i) => (
          <span key={s} className={i <= step ? "text-foreground" : ""}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {/* Step 0: Type (only if no preselected type) */}
      {effectiveStep === 0 && (
        <div className="grid grid-cols-2 gap-2">
          {SKILL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                type === t
                  ? "border-foreground/20 bg-muted/50"
                  : "border-border hover:border-foreground/10"
              }`}
            >
              <p className="font-medium">{SKILL_TYPE_LABELS[t]}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 1: File upload */}
      {effectiveStep === 1 && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add(
                "border-primary/50",
                "bg-primary/5"
              );
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove(
                "border-primary/50",
                "bg-primary/5"
              );
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove(
                "border-primary/50",
                "bg-primary/5"
              );
              if (e.dataTransfer.files.length > 0) {
                const event = {
                  target: { files: e.dataTransfer.files },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileSelect(event);
              }
            }}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-muted-foreground/30"
          >
            <Upload className="mx-auto mb-3 h-6 w-6 text-muted-foreground/40" />
            <p className="mb-1 text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              SKILL.md, server.json, .zip, .yaml, .txt — max 10MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.zip,.yaml,.yml,.json,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-1">
              {uploadedFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {getFileIcon(file.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.name.toLowerCase() === "skill.md" && sourceFormat === "skill-md" && (
                        <span className="ml-2 text-primary">
                          — SKILL.md detected, fields auto-populated
                        </span>
                      )}
                      {file.name.toLowerCase() === "server.json" && sourceFormat === "server-json" && (
                        <span className="ml-2 text-primary">
                          — server.json detected, MCP fields populated
                        </span>
                      )}
                      {file.name.toLowerCase().endsWith(".md") &&
                        file.name.toLowerCase() !== "skill.md" && (
                          <span className="ml-2 text-primary">
                            — will be used as README
                          </span>
                        )}
                    </p>
                  </div>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2.5">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Supported formats
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              <li>
                <span className="font-mono">SKILL.md</span> — Agent Skills
                standard (auto-populates fields from frontmatter)
              </li>
              <li>
                <span className="font-mono">server.json</span> — MCP Registry
                format (auto-populates MCP server fields)
              </li>
              <li>
                <span className="font-mono">.zip</span> — Full skill package
                with source files
              </li>
              <li>
                <span className="font-mono">.md</span> — README or
                documentation
              </li>
              <li>
                <span className="font-mono">.yaml</span> — Skill manifest or
                config
              </li>
            </ul>
          </div>

          {uploadedFiles.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">
              No files? You can write the README in the next step instead.
            </p>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {effectiveStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                placeholder="My Skill"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Slug</label>
              <Input
                placeholder="my-skill"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea
              placeholder="What does this do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">README</label>
              {readmeFromFile && (
                <span className="text-xs text-primary">
                  Loaded from uploaded file
                </span>
              )}
            </div>
            <MarkdownEditor
              value={readme}
              onChange={handleReadmeChange}
              height={250}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Category</label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "")}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select" />
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

          {type === "mcp-server" && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Transport
              </label>
              <Select
                value={transport}
                onValueChange={(v) => setTransport(v as McpTransport)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">stdio</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="streamable-http">
                    Streamable HTTP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Tags</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                className="h-8 text-sm"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-xs font-normal"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    >
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
            <label className="text-xs text-muted-foreground">
              Source URL (optional)
            </label>
            <Input
              placeholder="https://github.com/owner/repo"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="h-8 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {effectiveStep === 3 && <ReviewPanel {...{
        type, name, slug, category, description, sourceUrl, sourceFormat,
        transport, uploadedFiles,
      }} />}

      {/* Nav */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() =>
            step === 0
              ? setMode("choose")
              : setStep(step - 1)
          }
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {step < manualSteps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="btn-pill"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-pill"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

/** Shared review panel used by both Quick and Manual flows */
function ReviewPanel({
  type,
  name,
  slug,
  category,
  description,
  sourceUrl,
  sourceFormat,
  transport,
  uploadedFiles,
}: {
  type: SkillType;
  name: string;
  slug: string;
  category: string;
  description: string;
  sourceUrl: string;
  sourceFormat: SourceFormat | "";
  transport: McpTransport | "";
  uploadedFiles: File[];
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-[100px_1fr] gap-y-1.5">
        <span className="text-muted-foreground">Name</span>
        <span>{name}</span>
        <span className="text-muted-foreground">Type</span>
        <span>{SKILL_TYPE_LABELS[type]}</span>
        <span className="text-muted-foreground">Category</span>
        <span>{category}</span>
        {sourceFormat && (
          <>
            <span className="text-muted-foreground">Format</span>
            <span className="font-mono text-xs">
              {sourceFormat.replace("-", " ")}
            </span>
          </>
        )}
        {transport && (
          <>
            <span className="text-muted-foreground">Transport</span>
            <span className="font-mono text-xs">{transport}</span>
          </>
        )}
        {sourceUrl && (
          <>
            <span className="text-muted-foreground">Source</span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-xs underline"
            >
              {sourceUrl}
            </a>
          </>
        )}
        {uploadedFiles.length > 0 && (
          <>
            <span className="text-muted-foreground">Files</span>
            <span>{uploadedFiles.map((f) => f.name).join(", ")}</span>
          </>
        )}
      </div>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
