import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InstallCommand } from "@/components/install-command";
import { SKILL_TYPE_LABELS } from "@/lib/constants";
import { SkillType } from "@/lib/types";
import { TypeBadge } from "@/components/skill-card";
import {
  Package, Zap, Terminal, Bot, FileText, Upload, Search,
  Plus, Settings, ArrowRight, Database, Shield, Calendar,
  ExternalLink, Check, X, Download, Pencil, Trash2,
  ChevronLeft, ChevronRight, MoreHorizontal, Loader2,
  Copy, Share2, GitCompareArrows, Webhook, Globe, KeyRound,
} from "lucide-react";

const TYPES: SkillType[] = ["skill", "mcp-server", "agent-tool", "prompt-template"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="mb-6 text-lg font-medium tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-12 w-12 rounded-lg border border-border ${className}`} />
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Token({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <code className="font-mono text-xs text-foreground">{name}</code>
      <code className="font-mono text-[10px] text-muted-foreground">{value}</code>
    </div>
  );
}

export default async function DesignSystemPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-xl font-medium tracking-tight">Design System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete visual reference for all UI patterns. Use this as the source of truth when building new pages.
        </p>
      </div>

      <div className="space-y-12">

        {/* ── Layout ── */}
        <Section title="Layout">
          <div className="space-y-6">
            <SubSection title="Page container (all pages)">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">mx-auto max-w-5xl px-4</code>
              <p className="mt-2 text-xs text-muted-foreground">
                Every page and loading skeleton uses <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">max-w-5xl</code> (1024px). No exceptions.
              </p>
            </SubSection>

            <SubSection title="Two-column layouts">
              <div className="space-y-2">
                <Token name="Skill detail" value="grid gap-8 lg:grid-cols-[1fr_280px]" />
                <Token name="Edit form" value="grid gap-8 lg:grid-cols-[1fr_280px]" />
                <Token name="Search" value="flex gap-10 (sidebar + content)" />
              </div>
            </SubSection>

            <SubSection title="Vertical rhythm">
              <div className="flex flex-wrap gap-3">
                {[
                  { cls: "py-8", use: "Compact pages (detail, versions)" },
                  { cls: "py-10", use: "Standard pages (dashboard, search, publish)" },
                  { cls: "py-12", use: "Marketing pages (brand)" },
                ].map((item) => (
                  <div key={item.cls} className="rounded-lg border border-border px-3 py-2">
                    <code className="font-mono text-[10px] text-primary">{item.cls}</code>
                    <p className="text-[10px] text-muted-foreground">{item.use}</p>
                  </div>
                ))}
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Colors ── */}
        <Section title="Colors">
          <div className="space-y-6">
            <SubSection title="Core palette (oklch, warm-tinted)">
              <div className="flex flex-wrap gap-4">
                <Swatch label="background" className="bg-background" />
                <Swatch label="foreground" className="bg-foreground" />
                <Swatch label="primary" className="bg-primary" />
                <Swatch label="muted" className="bg-muted" />
                <Swatch label="muted-fg" className="bg-muted-foreground" />
                <Swatch label="accent" className="bg-accent" />
                <Swatch label="destructive" className="bg-destructive" />
                <Swatch label="card" className="bg-card" />
                <Swatch label="secondary" className="bg-secondary" />
                <Swatch label="surface" className="bg-surface" />
                <Swatch label="success" className="bg-success" />
              </div>
            </SubSection>

            <SubSection title="Borders">
              <div className="flex flex-wrap gap-4">
                <Swatch label="border" className="bg-border" />
                <Swatch label="border-subtle" className="bg-border-subtle" />
                <Swatch label="input" className="bg-input" />
                <Swatch label="ring" className="bg-ring" />
              </div>
              <div className="mt-3 space-y-1.5">
                <Token name="Card borders" value="border-border/70" />
                <Token name="Sidebar borders" value="border-border/60" />
                <Token name="Section dividers" value="border-border-subtle" />
                <Token name="Container dividers" value="divide-border/70" />
              </div>
            </SubSection>

            <SubSection title="Type badges (DS tokens only)">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                All badges use <code className="font-mono">variant=&quot;outline&quot;</code> with <code className="font-mono">text-muted-foreground</code>. No colored tints.
              </p>
            </SubSection>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div className="space-y-6">
            <SubSection title="Font families">
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">Inter (sans) &mdash; UI text</p>
                  <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">Geist Mono &mdash; code, slugs, versions, metadata</p>
                  <p className="font-mono text-lg">@team/code-reviewer v1.0.0</p>
                </div>
              </div>
            </SubSection>

            <SubSection title="Scale">
              <div className="space-y-2 rounded-lg border border-border/60 p-4">
                <p className="text-xl text-display">text-xl text-display &mdash; Page titles</p>
                <p className="text-lg text-display">text-lg text-display &mdash; Section headings</p>
                <p className="text-sm font-medium">text-sm font-medium &mdash; Card titles, labels</p>
                <p className="text-sm">text-sm &mdash; Body text, descriptions</p>
                <p className="text-[13px] text-muted-foreground">text-[13px] &mdash; List descriptions</p>
                <p className="text-xs">text-xs &mdash; Labels, metadata</p>
                <p className="text-[11px] text-muted-foreground/70">text-[11px] &mdash; Author slugs, secondary mono</p>
                <p className="text-[10px]">text-[10px] &mdash; Badge labels, tiny metadata</p>
              </div>
            </SubSection>

            <SubSection title="Monospace convention">
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">@author/slug</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">v1.0.0</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">us-east-1</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">AKIA...</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">skill.json</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">4 results</span>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <div className="space-y-6">
            <SubSection title="Custom button classes (globals.css)">
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-pill"><Check className="h-3 w-3" /> btn-pill</button>
                <button className="btn-pill-lg"><ArrowRight className="h-3.5 w-3.5" /> btn-pill-lg</button>
                <button className="btn-ghost">btn-ghost</button>
                <button className="btn-pill !border-red-500/40 !bg-red-500/10 !text-red-400">Destructive</button>
                <button className="btn-pill" disabled>Disabled</button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Rounded-full capsules. <code className="font-mono">btn-pill</code> for primary actions, <code className="font-mono">btn-ghost</code> for cancel/back.
              </p>
            </SubSection>

            <SubSection title="Typical pairing">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-3">
                <button className="btn-ghost">Cancel</button>
                <button className="btn-pill"><Check className="h-3 w-3" /> Save changes</button>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Interactive Patterns ── */}
        <Section title="Interactive Patterns">
          <div className="space-y-4">
            <SubSection title="Interaction classes (globals.css)">
              <div className="space-y-1.5">
                <Token name="interactive-ghost" value="Icon buttons, nav links, subtle actions" />
                <Token name="interactive-solid" value="Primary buttons, CTAs" />
                <Token name="interactive-card" value="Skill cards, clickable panels" />
                <Token name="interactive-toggle" value="Toggle switches" />
              </div>
            </SubSection>

            <SubSection title="Focus ring">
              <div className="space-y-1.5">
                <Token name="Inputs" value="ring-2 ring-ring/30 (subtle, 2px)" />
                <Token name="Buttons" value="ring-2 ring-ring/50 ring-offset-1" />
                <Token name="Cards" value="ring-2 ring-ring/50" />
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Form Elements ── */}
        <Section title="Form Elements">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <SubSection title="Input">
                <div className="space-y-2">
                  <Input placeholder="Default input" className="h-8 text-sm" />
                  <Input placeholder="Mono input" className="h-8 font-mono text-sm" />
                  <Input placeholder="Smaller (source URL)" className="h-7 font-mono text-[11px] text-muted-foreground" />
                </div>
              </SubSection>
            </div>
            <div className="space-y-4">
              <SubSection title="Textarea">
                <Textarea placeholder="Description..." rows={2} className="text-sm" />
              </SubSection>
            </div>
          </div>
        </Section>

        {/* ── Badges ── */}
        <Section title="Badges">
          <div className="space-y-4">
            <SubSection title="shadcn variants">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </div>
            </SubSection>
            <SubSection title="Inline metadata">
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">v1.0.0</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">skill-md</span>
                <span className="rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">v0.1.0</span>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Icons ── */}
        <Section title="Icons">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Lucide React only. Sizes: <code className="font-mono text-[10px]">h-2.5/3</code> inline tiny, <code className="font-mono text-[10px]">h-3.5</code> inline standard, <code className="font-mono text-[10px]">h-4</code> cards/nav, <code className="font-mono text-[10px]">h-5/6</code> empty states.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                Package, Zap, Terminal, Bot, FileText, Upload, Search,
                Plus, Settings, ArrowRight, Database, Shield, Calendar,
                ExternalLink, Check, X, Download, Pencil, Trash2,
                ChevronLeft, ChevronRight, MoreHorizontal, Loader2,
                Copy, Share2, GitCompareArrows, Webhook, Globe, KeyRound,
              ].map((Icon) => (
                <div key={Icon.displayName} className="flex flex-col items-center gap-1 rounded-lg border border-border/60 p-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-[9px] text-muted-foreground/70">{Icon.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Install Command ── */}
        <Section title="Install Command">
          <div className="max-w-lg space-y-3">
            <InstallCommand command="npx intertool install @team/code-reviewer" />
            <InstallCommand command="claude mcp add postgres-mcp npx @team/postgres-mcp" />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Uses <code className="font-mono">bg-secondary</code> background with mono text and copy button.
          </p>
        </Section>

        {/* ── Cards ── */}
        <Section title="Cards">
          <div className="space-y-6">
            <SubSection title="Grid card">
              <div className="max-w-[250px]">
                <div className="skill-card group rounded-lg border border-border/70 px-4 py-3.5 interactive-card">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium leading-tight">example-skill</h3>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">@team/example-skill</p>
                    </div>
                    <TypeBadge type="skill" />
                  </div>
                  <p className="line-clamp-2 text-sm leading-normal text-muted-foreground">
                    An example skill showing the grid card pattern.
                  </p>
                </div>
              </div>
            </SubSection>

            <SubSection title="List row (inside bordered container with divide-y)">
              <div className="max-w-lg rounded-lg border border-border/70 divide-y divide-border/70">
                <div className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="truncate text-sm font-medium leading-tight text-foreground">example-skill</h3>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">@team/example-skill</span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] leading-normal text-muted-foreground">An example skill in list view.</p>
                  </div>
                  <TypeBadge type="skill" />
                </div>
                <div className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="truncate text-sm font-medium leading-tight text-foreground">postgres-mcp</h3>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">@team/postgres-mcp</span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] leading-normal text-muted-foreground">PostgreSQL MCP server for queries.</p>
                  </div>
                  <TypeBadge type="mcp-server" />
                </div>
              </div>
            </SubSection>

            <SubSection title="Sidebar panel (no bg, border only)">
              <div className="max-w-[280px] rounded-lg border border-border/60">
                <div className="p-4">
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Author</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">TE</div>
                    <div>
                      <p className="text-sm font-medium">team</p>
                      <p className="text-xs text-muted-foreground">GitHub</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border-subtle p-4">
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Published</span>
                      <span className="font-mono text-xs">Mar 19, 2026</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-mono text-xs">v1.0.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Spacing ── */}
        <Section title="Spacing">
          <div className="space-y-4">
            <SubSection title="Common gaps">
              <div className="flex flex-wrap gap-3">
                {[
                  { cls: "gap-1.5", use: "Icon + text (sm)" },
                  { cls: "gap-2", use: "Icon + text, inline items" },
                  { cls: "gap-3", use: "Stacked cards, form fields" },
                  { cls: "gap-3.5", use: "List row content" },
                  { cls: "gap-4", use: "Grid items" },
                  { cls: "gap-6", use: "Nav items, filter groups" },
                  { cls: "gap-8", use: "Two-column grid gutters" },
                  { cls: "gap-10", use: "Search sidebar" },
                ].map((item) => (
                  <div key={item.cls} className="rounded-lg border border-border/60 px-3 py-2">
                    <code className="font-mono text-[10px] text-primary">{item.cls}</code>
                    <p className="text-[10px] text-muted-foreground">{item.use}</p>
                  </div>
                ))}
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Loading States ── */}
        <Section title="Loading States">
          <div className="space-y-4">
            <SubSection title="Skeleton pattern">
              <div className="max-w-sm space-y-2">
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded bg-muted/60" />
                <div className="h-9 animate-pulse rounded-md border border-border bg-muted/20" />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Use <code className="font-mono">bg-muted</code> for headings, <code className="font-mono">bg-muted/60</code> for secondary, <code className="font-mono">bg-muted/20</code> with border for inputs.
              </p>
            </SubSection>
            <SubSection title="Spinner">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <code className="font-mono text-[10px] text-muted-foreground">Loader2 animate-spin</code>
              </div>
            </SubSection>
          </div>
        </Section>

        {/* ── Dark Mode ── */}
        <Section title="Dark Mode">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Class-based via <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">next-themes</code> with <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">attribute=&quot;class&quot;</code>.
              All tokens redefined under <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">.dark</code> in globals.css with warm hue 75 tint.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-border p-4">
                <p className="mb-1 text-xs font-medium">Light</p>
                <p className="text-[10px] text-muted-foreground">Warm canvas (hue 83), oklch palette</p>
              </div>
              <div className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
                <p className="mb-1 text-xs font-medium">Dark</p>
                <p className="text-[10px] text-zinc-400">Warm dark (hue 75), transparency borders</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Responsive ── */}
        <Section title="Responsive Breakpoints">
          <div className="flex flex-wrap gap-3">
            {[
              { bp: "default", width: "0+", usage: "Single column, stacked" },
              { bp: "sm (640px)", width: "2-col skill grid", usage: "Show kbd hints" },
              { bp: "md (768px)", width: "Nav links visible", usage: "Inline headers" },
              { bp: "lg (1024px)", width: "4-col grid, 2-col layouts", usage: "Sidebar visible" },
            ].map((item) => (
              <div key={item.bp} className="rounded-lg border border-border/60 px-3 py-2.5">
                <code className="font-mono text-xs text-primary">{item.bp}</code>
                <p className="text-[10px] text-muted-foreground">{item.width}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{item.usage}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Conventions ── */}
        <Section title="Conventions">
          <div className="space-y-1.5">
            <Token name="Page heading" value="text-lg text-display (or text-xl for landing)" />
            <Token name="Section heading" value="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60" />
            <Token name="Label" value="text-xs text-muted-foreground" />
            <Token name="Author slug" value="font-mono text-[11px] text-muted-foreground/70" />
            <Token name="Version badge" value="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" />
            <Token name="Tab count" value="font-mono text-xs text-muted-foreground/60" />
            <Token name="Empty state icon" value="h-6 w-6 text-muted-foreground/40" />
            <Token name="Sidebar bg" value="No bg (transparent), border-border/60 only" />
            <Token name="Content panel bg" value="No bg (transparent), border-border/60 only" />
            <Token name="Transitions" value="duration-100 (buttons), duration-150 (cards, toggles)" />
          </div>
        </Section>

      </div>
    </div>
  );
}
