# Intertool

A private, self-hosted registry for AI agent skills, MCP servers, agent tools, and prompt templates. Your team publishes and discovers tools in one place, backed by your own S3 bucket.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sarangkharche/Intertool/actions/workflows/ci.yml/badge.svg)](https://github.com/sarangkharche/Intertool/actions/workflows/ci.yml)

**Zero database. Zero vendor lock-in. Your data stays in your S3.**

## What it does

- **Browse & search** skills, MCP servers, agent tools, and prompt templates with `Cmd+K`
- **Publish** via web UI, CLI, or API with drag-and-drop SKILL.md files or GitHub import
- **Install** with generated commands for Claude Code, Cursor, and CLI
- **Versioning** with automatic snapshots and changelogs
- **GitHub OAuth** with role-based access control (admin, member, viewer)
- **CLI** for search, install, publish, and management from the terminal
- **Dark mode** default with light mode toggle

## Architecture

```
Browser → Next.js 16 (App Router) → S3 (your bucket)
                ↓
          GitHub OAuth (auth only)
```

No database. Settings stored in a local JSON file or environment variables. All skill data lives in your S3 bucket as JSON files:

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

## Documentation

Full documentation is available at `/docs` in the running app, covering:

- [Getting started](content/docs/getting-started.mdx) — CLI setup and first install
- [Publishing](content/docs/publishing.mdx) — How to publish skills
- [CLI reference](content/docs/cli-reference.mdx) — All CLI commands
- [Deployment](content/docs/deployment.mdx) — S3 setup, Vercel deploy, environment variables
- [Architecture](content/docs/architecture.mdx) — Project structure, tech stack, data model
- [API overview](content/docs/api/overview.mdx) — API endpoints
- [Authentication](content/docs/api/authentication.mdx) — Auth, RBAC, tokens

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and how to submit changes.

## License

MIT
