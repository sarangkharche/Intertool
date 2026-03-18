# Intertool

A private, self-hosted registry for AI agent skills, MCP servers, agent tools, and prompt templates. Your team publishes and discovers tools in one place — backed by your own S3 bucket.

**Zero database. Zero vendor lock-in. Your data stays in your S3.**

---

## What it does

- **Browse & search** skills, MCP servers, agent tools, and prompt templates with `Cmd+K`
- **Publish** via web UI or API — drag-and-drop SKILL.md files, fill in a form, or import from GitHub
- **Import from GitHub** — paste a repo URL, auto-detects SKILL.md, server.json, skill.yaml
- **Install commands** — generated for Claude Code, Cursor, and CLI for every published item
- **Versioning** — every edit creates a version snapshot with changelog
- **Markdown editor** — rich editing for READMEs with live preview
- **GitHub OAuth** — team members sign in with their org GitHub accounts
- **Dark mode** — default dark theme with light mode toggle
- **Brand kit** — built-in brand guidelines page at `/brand`

## Architecture

```
Browser → Next.js 16 (App Router) → S3 (your bucket)
                ↓
          GitHub OAuth (auth only)
```

No database. No Redis (unless running intertool.sh SaaS mode). Settings are stored in a local JSON file or environment variables. All skill data lives in your S3 bucket as JSON files:

```
s3://your-bucket/
├── skills/{slug}/
│   ├── skill.json              ← current version
│   └── versions/
│       ├── 1.0.0.json          ← version snapshots
│       └── 1.0.1.json
├── mcp-servers/{slug}/skill.json
├── agent-tools/{slug}/skill.json
├── prompt-templates/{slug}/skill.json
├── _index.json                 ← auto-rebuilt catalog
└── _categories.json            ← seeded on first setup
```

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/sarangkharche/Intertool.git
cd Intertool
npm install
```

### 2. Create a GitHub OAuth app

Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**:

| Field | Value |
|---|---|
| Application name | Intertool (dev) |
| Homepage URL | `http://localhost:3000` |
| Callback URL | `http://localhost:3000/api/auth/callback/github` |

Save the **Client ID** and **Client Secret**.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_TRUST_HOST=true
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret
```

### 4. Start the dev server

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign in with GitHub, then go to `/admin` to configure your S3 bucket.

---

## S3 setup

### Create a bucket

Create a bucket in AWS S3, MinIO, Cloudflare R2, Wasabi, or any S3-compatible service.

### Create an IAM user (AWS)

1. Go to **IAM → Users → Create user** (e.g. `intertool-s3`)
2. **Attach a policy** with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": "s3:*",
        "Resource": [
            "arn:aws:s3:::your-bucket-name",
            "arn:aws:s3:::your-bucket-name/*"
        ]
    }]
}
```

3. **Create access key** → Security credentials → Create access key → "Application running outside AWS"
4. Save the Access Key ID (`AKIA...`) and Secret Access Key

### Configure in Intertool

**Option A: Admin UI** (local dev, Docker)

Go to `/admin`, enter your bucket name, region, access key, and secret key. Click **Test Connection** to verify, then **Save & activate**.

**Option B: Environment variables** (Vercel, read-only filesystem)

```env
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=your-secret-key
```

### S3-compatible services

| Service | Endpoint URL | Notes |
|---|---|---|
| **AWS S3** | *(leave blank)* | Default, no endpoint needed |
| **MinIO** | `http://localhost:9000` | Local dev, self-hosted |
| **Cloudflare R2** | `https://<account>.r2.cloudflarestorage.com` | No egress fees |
| **Wasabi** | `https://s3.wasabisys.com` | Cheap storage |
| **DigitalOcean Spaces** | `https://<region>.digitaloceanspaces.com` | Simple setup |
| **Backblaze B2** | `https://s3.<region>.backblazeb2.com` | Very cheap |

For S3-compatible services, set `S3_ENDPOINT` in your env or enter the endpoint URL in the admin UI.

---

## Deploy to Vercel

### 1. Deploy

```bash
npx vercel link
npx vercel deploy
```

### 2. Set environment variables

```bash
vercel env add AUTH_SECRET              # openssl rand -base64 32
vercel env add GITHUB_ID               # from GitHub OAuth app
vercel env add GITHUB_SECRET           # from GitHub OAuth app
vercel env add S3_BUCKET               # your-bucket-name
vercel env add S3_REGION               # us-east-1
vercel env add S3_ACCESS_KEY_ID        # AKIA...
vercel env add S3_SECRET_ACCESS_KEY    # your secret key
```

### 3. Update GitHub OAuth callback

Change the callback URL in your GitHub OAuth app to:

```
https://your-app.vercel.app/api/auth/callback/github
```

### 4. Deploy to production

```bash
npx vercel --prod
```

> On Vercel, S3 credentials must be set via environment variables since the filesystem is read-only. The `/admin` UI still works for testing connections.

---

## Using MinIO (fully local, no AWS)

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Create a bucket at `localhost:9001`, then configure in `/admin`:

| Field | Value |
|---|---|
| Bucket | `intertool` |
| Region | `us-east-1` |
| Access Key ID | `minioadmin` |
| Secret Access Key | `minioadmin` |
| Endpoint URL | `http://localhost:9000` |

---

## Publishing skills

### Via web UI

1. Click **Publish** in the header or dashboard
2. Choose **Upload** (drag-and-drop or GitHub import) or **Manual** (step-by-step form)
3. Fill in details, write README in the markdown editor
4. Click **Publish**

### Via API

```bash
# Set your API key
export INTERTOOL_URL=https://your-intertool.vercel.app
export INTERTOOL_API_KEY=your-api-key

# Publish
curl -X POST $INTERTOOL_URL/api/publish \
  -H "Authorization: Bearer $INTERTOOL_API_KEY" \
  -F "name=My Skill" \
  -F "slug=my-skill" \
  -F "type=skill" \
  -F "description=A useful skill for automation" \
  -F "readme=# My Skill" \
  -F "category=dev-tools" \
  -F 'tags=["automation","cli"]' \
  -F 'compatibility=["Claude Code","Cursor"]'
```

Generate an API key with `openssl rand -hex 32` and set it as `INTERTOOL_API_KEY` in your environment.

### Editing & versioning

1. Go to a skill's detail page → click **Edit** (visible to the author only)
2. Make changes, add a changelog note
3. Click **Save changes** — the previous version is snapshotted automatically
4. Version history is visible under the **Versions** tab

---

## Skill types

| Type | S3 folder | Description | Auto-detected from |
|---|---|---|---|
| **Skill** | `skills/` | Claude Code skills | `SKILL.md`, `skill.yaml` |
| **MCP Server** | `mcp-servers/` | Model Context Protocol servers | `server.json` |
| **Agent Tool** | `agent-tools/` | Reusable tools for AI agents | `skill.yaml` |
| **Prompt Template** | `prompt-templates/` | Shared prompt patterns | `skill.yaml` |

## File formats

**SKILL.md** — frontmatter + markdown:

```markdown
---
name: My Skill
description: What it does
type: skill
tags: [automation, cli]
---

# My Skill

Documentation here...
```

**server.json** — MCP Registry format:

```json
{
  "name": "my-mcp-server",
  "description": "What it does",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["@org/my-server"]
  }
}
```

**skill.yaml** — structured format:

```yaml
name: My Tool
description: What it does
type: agent-tool
tags: [automation]
compatibility: [Claude Code, Cursor]
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_SECRET` | Yes | — | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Yes | — | Set to `true` |
| `GITHUB_ID` | Yes | — | GitHub OAuth client ID |
| `GITHUB_SECRET` | Yes | — | GitHub OAuth client secret |
| `S3_BUCKET` | Vercel | — | S3 bucket name |
| `S3_REGION` | Vercel | `us-east-1` | S3 region |
| `S3_ACCESS_KEY_ID` | Vercel | — | S3 access key |
| `S3_SECRET_ACCESS_KEY` | Vercel | — | S3 secret key |
| `S3_ENDPOINT` | No | — | Custom endpoint for S3-compatible services |
| `S3_SESSION_TOKEN` | No | — | AWS session token (temporary credentials only) |
| `INTERTOOL_ADMIN` | No | — | GitHub username of admin user |
| `INTERTOOL_API_KEY` | No | — | API key for CLI/API publishing |

---

## Project structure

```
app/
├── (auth)/sign-in/              # Sign-in page
├── (main)/
│   ├── admin/                   # S3 storage settings
│   ├── brand/                   # Brand kit page
│   ├── browse/                  # Browse & filter registry
│   ├── dashboard/               # User dashboard
│   ├── publish/                 # Publish wizard (upload + manual)
│   └── skills/[slug]/           # Skill detail, edit, versions
├── api/
│   ├── admin/settings/          # S3 config (GET/PUT/POST)
│   ├── import/                  # GitHub repo import
│   ├── orgs/                    # Org management (SaaS mode)
│   ├── publish/                 # Publish API (form + bearer auth)
│   ├── search/                  # Search API
│   └── skills/                  # Skills CRUD API
components/
├── command-palette.tsx          # Cmd+K search
├── edit-skill-form.tsx          # Edit skill form with versioning
├── filter-sidebar.tsx           # Browse filters (type, category, sort)
├── header.tsx                   # App header with nav, search, user menu
├── footer.tsx                   # App footer
├── markdown-editor.tsx          # Rich markdown editor
├── publish-wizard.tsx           # Multi-step publish (upload + manual)
├── skill-card.tsx               # Skill list card
├── skill-readme.tsx             # Markdown renderer
├── install-command.tsx          # Copy-to-clipboard install command
└── ui/                          # shadcn/ui primitives
lib/
├── api-auth.ts                  # API auth (session + bearer token)
├── auth.ts                      # NextAuth v5 config (GitHub OAuth)
├── constants.ts                 # Type labels, colors, config
├── org.ts                       # Org slug resolution (SaaS mode)
├── registry.ts                  # S3-backed data layer
├── s3.ts                        # S3 client wrapper
├── settings.ts                  # Settings store (file + env + KV)
└── types.ts                     # TypeScript interfaces
```

## Tech stack

- **Framework**: [Next.js 16](https://nextjs.org) — App Router, React 19, Turbopack
- **Auth**: [NextAuth v5](https://authjs.dev) — GitHub OAuth
- **Storage**: [AWS S3 SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) — any S3-compatible service
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS 4](https://tailwindcss.com) + [Lucide](https://lucide.dev) icons
- **Fonts**: Inter (sans) + Geist Mono (monospace)
- **Editor**: [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) — markdown with preview

## License

MIT
