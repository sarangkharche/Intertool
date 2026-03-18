# Intertool Design System

Reference for building consistent UI across the Intertool registry.

---

## Colors

### Color Space

All colors use **OKLch** (perceptually uniform) via CSS custom properties. This prevents hue shift between light and dark modes.

### Core Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | Near-white, warm tint | `oklch(0.115, 0.005, 75)` | Page background |
| `--foreground` | `oklch(0.145, 0, 0)` | `oklch(0.93, 0.005, 75)` | Primary text |
| `--primary` | `oklch(0.545, 0.195, 260)` | `oklch(0.62, 0.2, 262)` | CTAs, links, focus rings |
| `--muted` | `oklch(0.965, 0.005, 83)` | `oklch(0.195, 0.005, 75)` | Subtle backgrounds |
| `--muted-foreground` | Mid gray | Mid gray | Secondary text, labels |
| `--border` | `oklch(0.905, 0.008, 83)` | `oklch(1, 0.005, 75 / 8%)` | Borders, dividers |
| `--destructive` | Red/orange | Red/orange | Delete actions, errors |
| `--success` | `oklch(0.72, 0.14, 173)` | Same | Success states |

### Skill Type Colors

Each skill type has a semantic color used in badges and icons:

| Type | Color | Tailwind Classes |
|------|-------|-----------------|
| `skill` | Blue | `bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300` |
| `mcp-server` | Purple | `bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300` |
| `agent-tool` | Emerald | `bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300` |
| `prompt-template` | Amber | `bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300` |

Defined in `lib/constants.ts` as `SKILL_TYPE_COLORS`.

---

## Typography

### Fonts

| Font | Variable | Usage |
|------|----------|-------|
| **Inter** | `--font-inter` | All UI text (body, headings, labels) |
| **Geist Mono** | `--font-geist-mono` | Code, slugs, version numbers, technical metadata |

Loaded from Google Fonts in `app/layout.tsx`. Applied globally via `antialiased` on `<body>`.

### Scale

| Class | Size | Usage |
|-------|------|-------|
| `text-[10px]` | 10px | Badge labels, tiny metadata |
| `text-[11px]` | 11px | Sub-labels |
| `text-xs` | 12px | Labels, filters, badges, timestamps |
| `text-sm` | 14px | Body text, descriptions, nav links |
| `text-base` | 16px | Default inputs |
| `text-xl` | 20px | Page titles |
| `text-3xl` / `sm:text-4xl` | 30/36px | Landing page hero |

### Weights

| Weight | Usage |
|--------|-------|
| Regular (400) | Body text, descriptions |
| Medium (500) | Labels, nav items, card titles, buttons |
| Semibold (600) | Markdown headings (prose) |

### Tracking

- `tracking-tight` on all page titles and headings
- Default tracking on body text
- `leading-relaxed` on descriptive paragraphs

### Monospace Convention

Use `font-mono` for anything that represents a technical identifier:
- `@author/slug`
- Version badges (`v0.1.0`)
- Install commands
- Access keys, bucket names
- Stats counters

---

## Spacing

### Page Layout

```
mx-auto max-w-5xl px-4
```

All pages use a centered container, max 60rem wide, with 16px horizontal padding.

### Vertical Rhythm

| Context | Spacing |
|---------|---------|
| Page top padding | `py-8` to `py-10` |
| Between sections | `mb-6` to `mb-8` |
| Section title to content | `mb-2` to `mb-3` |
| Card internal padding | `p-3` (compact) or `p-4` (default) |
| Between stacked cards | `gap-3` |
| Icon to text | `gap-1.5` (small) or `gap-2` (default) |

### Grid Layouts

- **Dashboard/detail:** `grid gap-8 lg:grid-cols-3` (2/3 + 1/3 sidebar)
- **Browse cards:** `grid gap-4` (single column list)
- **Landing features:** `grid gap-8 sm:grid-cols-3`
- **Publish type chooser:** `grid gap-3 sm:grid-cols-2`
- **Admin form fields:** `grid grid-cols-2 gap-3`

---

## Components

### Buttons

From `@base-ui/react` + CVA. Sizes and variants:

| Variant | Appearance |
|---------|-----------|
| `default` | Solid primary background |
| `outline` | Border only |
| `secondary` | Muted background |
| `ghost` | Transparent, hover reveals bg |
| `destructive` | Red/error |

| Size | Height |
|------|--------|
| `xs` | `h-6` |
| `sm` | `h-7` |
| `default` | `h-8` |
| `lg` | `h-9` |

Press feedback: `active:translate-y-px`

### Cards

Structure: `Card > CardHeader + CardContent + CardFooter`

Skill cards follow this pattern:
```
rounded-lg border border-border p-3-4
  → title (text-sm font-medium truncate)
  → author slug (font-mono text-xs text-muted-foreground)
  → description (text-xs text-muted-foreground line-clamp-2)
  → TypeBadge (positioned top-right or inline)
```

Hover: `hover:border-primary/30 hover:bg-muted/30`

### Badges

Pill-shaped (`rounded-4xl`), small (`h-5 text-[10px]`).

Type badges use the semantic color mapping. Generic badges use `variant="outline"` or `variant="secondary"`.

### Form Inputs

- Height: `h-8` (default), `h-7` (compact selects)
- Border: `border-input`, focus: `ring-3 ring-ring/50`
- Monospace inputs (credentials, slugs): add `font-mono text-sm`
- Password fields: `type="password"`
- Labels: `text-xs text-muted-foreground` above the input

### Selects

Shadcn Select with custom sizing via `data-size`:
- `h-8` default, `h-7` small (filters)
- Compact filter selects: `w-auto min-w-[100px] text-xs`

### Dialogs

- Backdrop: `bg-black/10 backdrop-blur-xs`
- Content: `rounded-xl`, centered
- Close: ghost icon button, top-right

### Install Command

```
rounded-lg border border-border bg-secondary px-4 py-3
  → $ prefix (select-none, muted)
  → command (font-mono text-sm)
  → copy button (Check icon on success, emerald color)
```

### Command Palette

Triggered by `Cmd+K`. Uses `cmdk` library. Search results grouped by type.

---

## Icons

**Library:** Lucide React (`lucide-react`)

### Size Convention

| Context | Size |
|---------|------|
| Inline with text | `h-3 w-3` or `h-3.5 w-3.5` |
| Card/list icons | `h-4 w-4` |
| Empty state | `h-5 w-5` or `h-6 w-6` |
| Hero/large empty | `h-6 w-6` |

### Semantic Icons

| Icon | Meaning |
|------|---------|
| `Package` | Intertool brand, generic skill |
| `Zap` | Skill type |
| `Terminal` | MCP Server type |
| `Wrench` | Agent Tool type |
| `FileText` | Prompt Template type |
| `Upload` | Publish action |
| `Search` | Search/browse |
| `Plus` | Create/add |
| `Settings` | Admin/settings |
| `ArrowRight` | Navigation, "go to" |
| `Database` | S3/storage |
| `Shield` | Access control, security |

---

## Dark Mode

### Implementation

- Provider: `next-themes` with `attribute="class"`
- Default: `light`, system preference enabled
- Toggle: Sun/Moon icon button in header with rotation animation
- `disableTransitionOnChange: true` (no flash on switch)

### Pattern

All color tokens are redefined under `.dark` in `globals.css`. Use Tailwind's `dark:` prefix for component-level overrides:

```
bg-blue-50 dark:bg-blue-950
text-blue-700 dark:text-blue-300
```

---

## Responsive

### Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| Default | 0+ | Single column, full-width |
| `sm` | 640px | 2-col grids, show ⌘K hint |
| `md` | 768px | Show nav links, dashboard sidebar |
| `lg` | 1024px | 3-col dashboard grid |

### Patterns

- **Nav links:** `hidden md:flex`
- **Publish text:** `hidden sm:inline`
- **⌘K badge:** `hidden sm:inline-block`
- **Grids:** single column → `sm:grid-cols-2` → `lg:grid-cols-3`

---

## Header

```
sticky top-0 z-50
border-b border-border
bg-background/90 backdrop-blur-sm
h-12
```

Layout: logo | nav links | search bar (flex-1) | github + theme + publish + avatar

### Search Bar

```
h-7 max-w-sm rounded-md border-border bg-muted/50
hover:border-primary/30 hover:bg-muted
```

---

## Prose / Markdown

Skill READMEs render with Tailwind Typography:

```
prose prose-sm dark:prose-invert
prose-headings:font-semibold prose-headings:tracking-tight
prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
prose-pre:rounded-lg prose-pre:bg-secondary
prose-a:text-primary prose-a:no-underline hover:prose-a:underline
```

---

## File Reference

| File | Contains |
|------|----------|
| `app/globals.css` | All CSS variables, theme tokens, base layer |
| `components.json` | Shadcn config (style, icons, aliases) |
| `lib/constants.ts` | Type labels, type colors, pagination |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `components/ui/*` | Shadcn primitives (button, card, badge, input, select, dialog, etc.) |
| `components/providers.tsx` | ThemeProvider + SessionProvider setup |
