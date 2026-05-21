# Intertool

A private registry and approval layer for AI agent skills, MCP servers, prompt playbooks, and internal tools. Your team publishes, reviews, versions, and installs approved capabilities from one place.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/sarangkharche/Intertool/actions/workflows/ci.yml/badge.svg)](https://github.com/sarangkharche/Intertool/actions/workflows/ci.yml)

**Private by default. No agent-platform lock-in. Registry artifacts stay in your S3-compatible storage.**

## What it does

- **Browse & search** approved skills, MCP servers, agent tools, and prompt playbooks with `Cmd+K`
- **Publish** via web UI, CLI, or API with drag-and-drop SKILL.md files or GitHub import
- **Review** submissions before they become installable by the team
- **Install** approved artifacts with CLI flows for agent projects
- **Versioning** with automatic snapshots and changelogs
- **GitHub OAuth** with role-based access control (owner, admin, member)
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
│   ├── files/                  ← optional package files
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

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| Application name | Intertool (dev)                                  |
| Homepage URL     | `http://localhost:3000`                          |
| Callback URL     | `http://localhost:3000/api/auth/callback/github` |

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
