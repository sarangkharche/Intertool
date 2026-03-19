import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { InstallCommand } from "@/components/install-command";
import { SKILL_TYPE_LABELS, SKILL_TYPE_COLORS } from "@/lib/constants";
import { SkillType } from "@/lib/types";
import {
  Package, Zap, Terminal, Bot, FileText, Upload, Search,
  Plus, Settings, ArrowRight, Database, Shield, Calendar,
  ExternalLink, Check, X,
} from "lucide-react";
import Link from "next/link";



const TYPES: SkillType[] = ["skill", "mcp-server", "agent-tool", "prompt-template"];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  skill: <Zap className="h-4 w-4" />,
  "mcp-server": <Terminal className="h-4 w-4" />,
  "agent-tool": <Bot className="h-4 w-4" />,
  "prompt-template": <FileText className="h-4 w-4" />,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="mb-6 text-lg font-medium tracking-tight">{title}</h2>
      {children}
    </section>
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

export default async function DesignSystemPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-xl font-medium tracking-tight">Design System</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visual reference for all UI patterns used across Intertool.
        </p>
      </div>

      <div className="space-y-12">

        {/* ── Colors ── */}
        <Section title="Colors">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Core</p>
              <div className="flex flex-wrap gap-4">
                <Swatch label="background" className="bg-background" />
                <Swatch label="foreground" className="bg-foreground" />
                <Swatch label="primary" className="bg-primary" />
                <Swatch label="secondary" className="bg-secondary" />
                <Swatch label="muted" className="bg-muted" />
                <Swatch label="accent" className="bg-accent" />
                <Swatch label="destructive" className="bg-destructive" />
                <Swatch label="card" className="bg-card" />
                <Swatch label="border" className="bg-border" />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Skill Types</p>
              <div className="flex flex-wrap gap-3">
                {TYPES.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${SKILL_TYPE_COLORS[type]}`}>
                      {TYPE_ICONS[type]}
                      {SKILL_TYPE_LABELS[type]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Font Families</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Inter (sans-serif) &mdash; UI text</p>
                  <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Geist Mono &mdash; code, slugs, metadata</p>
                  <p className="font-mono text-lg">@team/code-reviewer v1.0.0</p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Scale</p>
              <div className="space-y-2 rounded-lg border border-border p-4">
                <p className="text-3xl font-medium tracking-tight">text-3xl &mdash; Landing hero</p>
                <p className="text-xl font-medium tracking-tight">text-xl &mdash; Page titles</p>
                <p className="text-base">text-base &mdash; Default body</p>
                <p className="text-sm">text-sm &mdash; Body text, descriptions</p>
                <p className="text-xs">text-xs &mdash; Labels, badges, metadata</p>
                <p className="text-[10px]">text-[10px] &mdash; Badge labels, tiny metadata</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Monospace convention</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">@author/slug</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">v0.1.0</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">us-east-1</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">AKIA...</span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs">skill.json</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Badges ── */}
        <Section title="Badges">
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Type badges</p>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <Badge key={type} className={`${SKILL_TYPE_COLORS[type]} shrink-0 text-[10px] font-normal`}>
                    {SKILL_TYPE_LABELS[type]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Variants</p>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Variants</p>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-pill">Pill</button>
                <button className="btn-pill-lg">Pill Large</button>
                <button className="btn-ghost">Ghost</button>
                <button className="btn-pill !border-red-500/40 !bg-red-500/10 !text-red-400">Destructive</button>
                <button className="btn-pill" disabled>Disabled</button>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Usage</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <button className="btn-ghost">Cancel</button>
                  <button className="btn-pill">Save</button>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Icons ── */}
        <Section title="Icons">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Lucide React. Sizes: h-3/3.5 inline, h-4 cards, h-5/6 empty states.</p>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: <Package className="h-4 w-4" />, label: "Package" },
                { icon: <Zap className="h-4 w-4" />, label: "Zap" },
                { icon: <Terminal className="h-4 w-4" />, label: "Terminal" },
                { icon: <Bot className="h-4 w-4" />, label: "Bot" },
                { icon: <FileText className="h-4 w-4" />, label: "FileText" },
                { icon: <Upload className="h-4 w-4" />, label: "Upload" },
                { icon: <Search className="h-4 w-4" />, label: "Search" },
                { icon: <Plus className="h-4 w-4" />, label: "Plus" },
                { icon: <Settings className="h-4 w-4" />, label: "Settings" },
                { icon: <ArrowRight className="h-4 w-4" />, label: "ArrowRight" },
                { icon: <Database className="h-4 w-4" />, label: "Database" },
                { icon: <Shield className="h-4 w-4" />, label: "Shield" },
                { icon: <Calendar className="h-4 w-4" />, label: "Calendar" },
                { icon: <ExternalLink className="h-4 w-4" />, label: "ExternalLink" },
                { icon: <Check className="h-4 w-4" />, label: "Check" },
                { icon: <X className="h-4 w-4" />, label: "X" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3">
                  <div className="text-muted-foreground">{item.icon}</div>
                  <span className="font-mono text-[10px] text-muted-foreground">{item.label}</span>
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
        </Section>

        {/* ── Cards ── */}
        <Section title="Cards">
          <div className="grid max-w-lg gap-3">
            <div className="rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium">example-skill</h3>
                  <p className="font-mono text-xs text-muted-foreground">@team/example-skill</p>
                </div>
                <Badge className={`${SKILL_TYPE_COLORS["skill"]} shrink-0 text-[10px] font-normal`}>
                  Skill
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                An example skill card showing the standard layout pattern with type badge, author slug, and description.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium">postgres-mcp</h3>
                  <p className="font-mono text-xs text-muted-foreground">@team/postgres-mcp</p>
                </div>
                <Badge className={`${SKILL_TYPE_COLORS["mcp-server"]} shrink-0 text-[10px] font-normal`}>
                  MCP Server
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                PostgreSQL MCP server for database queries and schema inspection.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Spacing ── */}
        <Section title="Spacing">
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Page container</p>
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">mx-auto max-w-5xl px-4</code>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">Common gaps</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { gap: "gap-1.5", label: "Icon + text (sm)" },
                  { gap: "gap-2", label: "Icon + text" },
                  { gap: "gap-3", label: "Stacked cards" },
                  { gap: "gap-4", label: "Grid items" },
                  { gap: "gap-6", label: "Nav items" },
                  { gap: "gap-8", label: "Sections" },
                ].map((item) => (
                  <div key={item.gap} className="rounded-lg border border-border px-3 py-2">
                    <code className="font-mono text-[10px] text-primary">{item.gap}</code>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Dark Mode ── */}
        <Section title="Dark Mode">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Class-based via <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">next-themes</code> with <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">attribute=&quot;class&quot;</code>.
              Toggle in the header. All color tokens redefined under <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.dark</code> in globals.css.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-border bg-white p-4 text-zinc-900">
                <p className="mb-1 text-xs font-medium">Light</p>
                <p className="text-xs text-zinc-500">Default mode</p>
              </div>
              <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
                <p className="mb-1 text-xs font-medium">Dark</p>
                <p className="text-xs text-zinc-400">System or manual toggle</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Responsive ── */}
        <Section title="Responsive Breakpoints">
          <div className="flex flex-wrap gap-3">
            {[
              { bp: "default", width: "0+", usage: "Single column, mobile" },
              { bp: "sm", width: "640px", usage: "2-col grids, show hints" },
              { bp: "md", width: "768px", usage: "Show nav links" },
              { bp: "lg", width: "1024px", usage: "3-col dashboard" },
            ].map((item) => (
              <div key={item.bp} className="rounded-lg border border-border px-3 py-2.5">
                <code className="font-mono text-xs text-primary">{item.bp}</code>
                <p className="text-[10px] text-muted-foreground">{item.width}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{item.usage}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
