# Intertool

Intertool is a shared, permission-aware memory layer for coding agents. An engineer can publish one reviewed, sourced learning and another engineer's fresh Claude Code session can retrieve it without exposing raw conversations, terminal history, or source files.

## MVP capabilities

- Multi-tenant organisations, memberships, and repositories
- Draft, publish, edit, dispute, archive, and stale-report workflows
- Immutable versions and security-sensitive audit events
- PostgreSQL full-text retrieval with deterministic repository, path, confidence, freshness, source, and report ranking
- Personal MCP tokens that are returned once, stored as SHA-256 hashes, and independently revocable
- A remote Streamable HTTP MCP endpoint with exactly five tools: `get_context`, `search_context`, `propose_memory`, `publish_memory`, and `report_stale`
- GitHub OAuth plus a production-disabled local development login
- A Claude Code plugin with MCP configuration, retrieval guidance, a SessionStart instruction, and `/intertool:remember`
- A restrained, accessible dashboard for onboarding and memory governance

## Local development

Prerequisites: Node.js 20+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env.local
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set at least these local values in `.env.local`:

```dotenv
DATABASE_URL=postgresql://intertool:intertool@localhost:5432/intertool
AUTH_URL=http://localhost:3000
AUTH_SECRET=<generate with: openssl rand -base64 32>
WEB_INTERNAL_SECRET=<generate with: openssl rand -base64 32>
DEV_AUTH_BYPASS=true
```

Open [http://localhost:3000](http://localhost:3000). The seeded local identities are Alice, Bob, and Mallory. The API and MCP service listens on [http://localhost:3001](http://localhost:3001); `GET /health` is its readiness check.

`pnpm dev` loads the root `.env.local` into the API service as well as the Next.js application. If you intentionally run the web application on another port, update `AUTH_URL`/`NEXTAUTH_URL` and the GitHub OAuth callback URL to that same origin.

Local development, migration, seed, and integration-test commands default to the Docker PostgreSQL URL above. An explicitly exported `DATABASE_URL` takes precedence when you deliberately need another database; a stale value inside `.env.local` cannot silently redirect these local commands.

For GitHub sign-in, set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` and leave `DEV_AUTH_BYPASS=false` outside local testing.

## Claude Code connection

Create a personal token from **API tokens**, then put this in the target repository's `.mcp.json`:

```json
{
  "mcpServers": {
    "intertool": {
      "type": "http",
      "url": "${INTERTOOL_URL:-http://localhost:3001}/mcp",
      "headers": {
        "Authorization": "Bearer ${INTERTOOL_API_TOKEN}"
      }
    }
  }
}
```

Keep the secret outside source control:

```bash
export INTERTOOL_API_TOKEN="itk_..."
```

The bundled plugin is in `claude-plugin/`. Validate it with:

```bash
claude plugin validate ./claude-plugin
```

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm db:migrate
pnpm db:seed
```

Playwright expects the local PostgreSQL container to be running. It starts the API and web processes itself.

## Architecture

```text
Browser -> Next.js web -> signed internal identity -> Fastify REST API -> PostgreSQL
Claude Code -> Bearer token -> Streamable HTTP MCP -> retrieval service -> PostgreSQL
```

The authenticated session or token selects the organisation. Request bodies cannot select `organization_id`, every tenant-owned query includes the authenticated organisation, and unknown cross-tenant objects return the same `404` as absent objects.

The web application remains at the repository root to preserve Intertool's established UI and documentation setup. The separate service and shared packages live in `apps/server`, `packages/contracts`, `packages/db`, and `packages/retrieval` under the pnpm workspace.

## Security boundary

- Token plaintext is returned only at creation.
- Authorization and cookies are redacted from service logs.
- Mutations through the web proxy enforce same-origin requests.
- Memory inputs cap lengths, reject unsafe paths/non-HTTPS sources, and block high-confidence secret patterns.
- Only published, unexpired, non-disputed, non-archived memories are retrievable.
- Intertool stores structured memories, not raw agent transcripts, prompts, code files, or terminal output.

## Demo

Follow [DEMO.md](DEMO.md) for the complete Alice-to-Bob, cross-organisation isolation, and token-revocation walkthrough.

## Current limitations

- The MVP uses deterministic lexical retrieval; embeddings and automatic contradiction detection are intentionally excluded.
- GitHub OAuth creates identity sessions but does not install a GitHub App or synchronise repository permissions.
- The in-process rate limiter is suitable for one service instance; production multi-instance deployments need a shared limiter.
- The dashboard currently operates on the authenticated user's first active organisation membership; organisation switching is not part of the MVP.
- Team membership is read-only in the dashboard. Adding, inviting, changing, or removing members is not part of the MVP.
- This repository is not deployed by the build process.

## License

MIT
