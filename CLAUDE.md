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

Sidebar order is controlled by `content/docs/meta.json` and `content/docs/api/meta.json`.

## Aliases

- **acp** — `git add -A && git commit && git push`. Stage all files, commit with a descriptive message, and push to origin.
