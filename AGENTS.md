# Intertool

## Documentation

Docs live in `content/docs/` as MDX files and are served at `/docs` via Fumadocs.

**When making changes to the CLI, API, authentication, publishing flow, or any user-facing behavior, always update the corresponding docs in `content/docs/`.**

Key doc files:

- `content/docs/index.mdx` — Overview and quick start
- `content/docs/getting-started.mdx` — CLI setup and first install
- `content/docs/publishing.mdx` — How to publish skills
- `content/docs/cli-reference.mdx` — All CLI commands
- `content/docs/api/overview.mdx` — API endpoints
- `content/docs/api/authentication.mdx` — Auth and roles
- `content/docs/development-context.mdx` — LLM-oriented project map and change rules
- `content/docs/browser-e2e-automation.mdx` — Playwright workflow and E2E coverage map

Sidebar order is controlled by `content/docs/meta.json` and `content/docs/api/meta.json`.

## LLM context

- `/llms.txt` lists documentation pages for agents.
- `/llms-full.txt` includes the full docs corpus, including development context.
- Read `content/docs/development-context.mdx` before broad code changes.
- Read `content/docs/browser-e2e-automation.mdx` before browser-visible workflow changes.

## Tests and automation

- Root checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`
- Browser E2E: `npm run test:e2e:install` once, then `npm run test:e2e`
- E2E tests live in `tests/e2e/` and use Playwright.
- Prefer accessible Playwright locators (`getByRole`, `getByLabel`, `getByText`); add test IDs only when accessible locators are not stable.

## Aliases

- **acp** — `git add -A && git commit && git push`. Stage all files, commit with a descriptive message, and push to origin.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
