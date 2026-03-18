import { Package } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Kit — Intertool",
  description: "Brand guidelines, colors, typography, and assets for Intertool.",
};

function ColorSwatch({
  name,
  variable,
  value,
  textClass = "text-foreground",
}: {
  name: string;
  variable: string;
  value: string;
  textClass?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className="h-16 rounded-lg border border-border"
        style={{ backgroundColor: `var(${variable})` }}
      />
      <p className={`text-sm font-medium ${textClass}`}>{name}</p>
      <p className="font-mono text-[11px] text-muted-foreground">{variable}</p>
      <p className="font-mono text-[11px] text-muted-foreground/60">{value}</p>
    </div>
  );
}

function TypographySample({
  label,
  className,
  text,
  spec,
}: {
  label: string;
  className: string;
  text: string;
  spec: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border py-4 last:border-0">
      <div>
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
          {label}
        </p>
        <p className={className}>{text}</p>
      </div>
      <p className="shrink-0 font-mono text-[11px] text-muted-foreground/60">
        {spec}
      </p>
    </div>
  );
}

export default function BrandPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-16">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
            <Package className="h-5 w-5 text-background" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Brand Kit</h1>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Guidelines for representing Intertool consistently across interfaces,
          documentation, and communications.
        </p>
      </div>

      {/* ── Logo ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">Logo</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          The Intertool mark is the Package icon paired with the wordmark. Use
          the full lockup where space allows; the icon alone for compact
          contexts.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Dark background */}
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-foreground px-8 py-12">
            <div className="flex items-center gap-2.5">
              <Package className="h-6 w-6 text-background" />
              <span className="text-xl font-medium tracking-tight text-background">
                intertool
              </span>
            </div>
            <p className="text-[11px] text-background/40">
              Primary — on dark backgrounds
            </p>
          </div>

          {/* Light background */}
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-background px-8 py-12">
            <div className="flex items-center gap-2.5">
              <Package className="h-6 w-6 text-foreground" />
              <span className="text-xl font-medium tracking-tight text-foreground">
                intertool
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inverse — on light backgrounds
            </p>
          </div>
        </div>

        {/* Icon only */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-foreground px-4 py-6">
            <Package className="h-8 w-8 text-background" />
            <p className="text-[11px] text-background/40">Icon dark</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-4 py-6">
            <Package className="h-8 w-8 text-foreground" />
            <p className="text-[11px] text-muted-foreground">Icon light</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-primary px-4 py-6">
            <Package className="h-8 w-8 text-primary-foreground" />
            <p className="text-[11px] text-primary-foreground/60">
              Icon accent
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted px-4 py-6">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Icon muted</p>
          </div>
        </div>

        {/* Clear space */}
        <div className="mt-6 rounded-lg border border-dashed border-border p-6">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Clear space
          </p>
          <p className="text-sm text-muted-foreground">
            Maintain a minimum clear space equal to the height of the icon on
            all sides. Never place the logo closer than this to other elements,
            edges, or content.
          </p>
        </div>
      </section>

      {/* ── Colors ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">Colors</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          The palette uses oklch for perceptual uniformity. Dark mode applies a
          subtle warm tint (hue 75) to prevent a clinical feel.
        </p>

        {/* Core colors */}
        <p className="mb-3 text-xs font-medium text-muted-foreground">Core</p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ColorSwatch
            name="Background"
            variable="--background"
            value="oklch(0.115 0.005 75)"
          />
          <ColorSwatch
            name="Foreground"
            variable="--foreground"
            value="oklch(0.93 0.005 75)"
          />
          <ColorSwatch
            name="Primary"
            variable="--primary"
            value="oklch(0.62 0.2 262)"
          />
          <ColorSwatch
            name="Muted"
            variable="--muted"
            value="oklch(0.195 0.005 75)"
          />
        </div>

        {/* Surface colors */}
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Surfaces
        </p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ColorSwatch
            name="Card"
            variable="--card"
            value="oklch(0.155 0.005 75)"
          />
          <ColorSwatch
            name="Border"
            variable="--border"
            value="oklch(1 0.005 75 / 8%)"
          />
          <ColorSwatch
            name="Input"
            variable="--input"
            value="oklch(1 0.005 75 / 10%)"
          />
          <ColorSwatch
            name="Accent"
            variable="--accent"
            value="oklch(0.195 0.005 75)"
          />
        </div>

        {/* Semantic colors */}
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Semantic
        </p>
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ColorSwatch
            name="Success"
            variable="--success"
            value="oklch(0.72 0.14 173)"
          />
          <ColorSwatch
            name="Destructive"
            variable="--destructive"
            value="oklch(0.65 0.25 25)"
          />
          <ColorSwatch
            name="Muted Foreground"
            variable="--muted-foreground"
            value="oklch(0.55 0.01 75)"
          />
          <ColorSwatch
            name="Ring / Focus"
            variable="--ring"
            value="oklch(0.62 0.2 262)"
          />
        </div>

        {/* Usage notes */}
        <div className="rounded-lg border border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Usage notes
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">--primary</code> sparingly
              — links, active states, and key CTAs only.
            </li>
            <li>
              Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">--muted-foreground</code> for
              secondary text, labels, and descriptions.
            </li>
            <li>
              Never place gray text on colored backgrounds. Use transparency or
              a tinted shade instead.
            </li>
            <li>
              All colors include a warm chroma of{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">0.005</code> at hue{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">75</code> to avoid
              clinical pure-black neutrals.
            </li>
          </ul>
        </div>
      </section>

      {/* ── Typography ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">Typography</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Inter for interface text. Geist Mono for code, commands, versions, and
          identifiers.
        </p>

        <div className="mb-6 rounded-lg border border-border">
          <TypographySample
            label="Page title"
            className="text-xl font-medium tracking-tight"
            text="Dashboard"
            spec="text-xl / font-medium / tracking-tight"
          />
          <TypographySample
            label="Section heading"
            className="text-lg font-medium tracking-tight"
            text="Browse Registry"
            spec="text-lg / font-medium / tracking-tight"
          />
          <TypographySample
            label="Card title"
            className="text-sm font-medium"
            text="Claude Code Skill"
            spec="text-sm / font-medium"
          />
          <TypographySample
            label="Body text"
            className="text-sm leading-relaxed text-muted-foreground"
            text="A private registry for your organization. Share skills, MCP servers, agent tools, and prompt templates."
            spec="text-sm / leading-relaxed / text-muted-foreground"
          />
          <TypographySample
            label="Label"
            className="text-xs text-muted-foreground"
            text="Category"
            spec="text-xs / text-muted-foreground"
          />
          <TypographySample
            label="Monospace"
            className="font-mono text-sm"
            text="@sarang/my-skill v1.0.0"
            spec="font-mono / text-sm"
          />
          <TypographySample
            label="Code / command"
            className="rounded bg-muted px-2 py-1 font-mono text-xs"
            text="npx intertool install @org/skill-name"
            spec="font-mono / text-xs / bg-muted"
          />
          <TypographySample
            label="Badge / tag"
            className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            text="v0.1.0"
            spec="font-mono / text-[10px] / bg-muted"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Sans — Inter
            </p>
            <p className="text-2xl font-light">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p className="text-2xl font-light">
              abcdefghijklmnopqrstuvwxyz
            </p>
            <p className="text-2xl font-light">0123456789</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Mono — Geist Mono
            </p>
            <p className="font-mono text-2xl font-light">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p className="font-mono text-2xl font-light">
              abcdefghijklmnopqrstuvwxyz
            </p>
            <p className="font-mono text-2xl font-light">0123456789</p>
          </div>
        </div>
      </section>

      {/* ── Iconography ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">
          Iconography
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Icons are from Lucide at 14px (h-3.5 w-3.5) for inline use, 16px
          (h-4 w-4) for standalone, and 20px (h-5 w-5) for hero contexts. Always
          monochrome in <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">text-muted-foreground</code>.
        </p>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {[
            { name: "Package", icon: "package" },
            { name: "Zap", icon: "zap" },
            { name: "Terminal", icon: "terminal" },
            { name: "Wrench", icon: "wrench" },
            { name: "FileText", icon: "file-text" },
            { name: "Upload", icon: "upload" },
            { name: "Search", icon: "search" },
            { name: "ArrowRight", icon: "arrow-right" },
          ].map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center text-muted-foreground">
                {/* Using CSS to render the icon name since we can't dynamically import */}
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.icon === "package" && (
                    <>
                      <path d="M16.5 9.4 7.55 4.24" />
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.29 7 12 12 20.71 7" />
                      <line x1="12" x2="12" y1="22" y2="12" />
                    </>
                  )}
                  {item.icon === "zap" && <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />}
                  {item.icon === "terminal" && (
                    <>
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" x2="20" y1="19" y2="19" />
                    </>
                  )}
                  {item.icon === "wrench" && (
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  )}
                  {item.icon === "file-text" && (
                    <>
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
                    </>
                  )}
                  {item.icon === "upload" && (
                    <>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </>
                  )}
                  {item.icon === "search" && (
                    <>
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </>
                  )}
                  {item.icon === "arrow-right" && (
                    <>
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </>
                  )}
                </svg>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground">
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Components ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">
          Components
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Key UI patterns used across the application.
        </p>

        <div className="space-y-6">
          {/* Buttons */}
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Buttons
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
                Primary
              </button>
              <button className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                Secondary
              </button>
              <button className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Ghost
              </button>
              <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white">
                Destructive
              </button>
              <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background opacity-50">
                Disabled
              </button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Badges &amp; tags
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Skill
              </span>
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                MCP Server
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Agent Tool
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Prompt Template
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                v1.0.0
              </span>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                Claude Code
              </span>
            </div>
          </div>

          {/* Cards */}
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Cards
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="truncate text-sm font-medium">
                      Example Skill
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      @author/example-skill
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Skill
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A short description of what this skill does for the team.
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <Package className="mx-auto mb-3 h-5 w-5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Empty state</p>
                <p className="mt-1 text-xs text-primary">Action link</p>
              </div>
            </div>
          </div>

          {/* Install command */}
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Install command
            </p>
            <div className="flex items-center rounded-lg border border-border bg-muted/50 px-4 py-3">
              <code className="flex-1 font-mono text-sm">
                npx intertool install @org/my-skill
              </code>
              <button className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground">
                Copy
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Voice & Tone ── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-medium tracking-tight">
          Voice &amp; Tone
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          How Intertool communicates.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-medium text-emerald-500">Do</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Be direct and concise</li>
              <li>Use technical terms your audience knows</li>
              <li>Lead with the action, not the explanation</li>
              <li>Use sentence case for headings</li>
              <li>Say &quot;skill&quot; not &quot;resource&quot; or &quot;asset&quot;</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-medium text-destructive">
              Don&apos;t
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>Use marketing superlatives (&quot;amazing&quot;, &quot;powerful&quot;)</li>
              <li>Add emojis to interface text</li>
              <li>Use Title Case For Every Heading</li>
              <li>Over-explain obvious actions</li>
              <li>Use &quot;please&quot; in button labels</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Spacing ── */}
      <section>
        <h2 className="mb-1 text-lg font-medium tracking-tight">
          Spacing &amp; Layout
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Consistent spacing scale and layout rules.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Spacing scale (Tailwind)
            </p>
            <div className="flex items-end gap-2">
              {[
                { size: "1", px: "4px" },
                { size: "1.5", px: "6px" },
                { size: "2", px: "8px" },
                { size: "3", px: "12px" },
                { size: "4", px: "16px" },
                { size: "5", px: "20px" },
                { size: "6", px: "24px" },
                { size: "8", px: "32px" },
                { size: "10", px: "40px" },
                { size: "16", px: "64px" },
              ].map((s) => (
                <div key={s.size} className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 rounded-sm bg-primary/20"
                    style={{ height: s.px }}
                  />
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {s.size}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Layout rules
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                Max content width:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">max-w-5xl</code>{" "}
                (1024px)
              </li>
              <li>
                Page padding:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">px-4</code>{" "}
                (16px horizontal)
              </li>
              <li>
                Section spacing:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">mb-8</code>{" "}
                (32px between sections)
              </li>
              <li>
                Card padding:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">p-4</code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">p-5</code>
              </li>
              <li>
                Border radius:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">rounded-lg</code>{" "}
                (8px) for cards,{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">rounded-md</code>{" "}
                (6px) for inputs/buttons
              </li>
              <li>
                Header height:{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">h-12</code>{" "}
                (48px)
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
