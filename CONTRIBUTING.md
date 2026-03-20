# Contributing to Intertool

Thank you for your interest in contributing to Intertool! This guide will help you get started.

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

### Prerequisites

- Node.js 18+
- A GitHub OAuth app (see [Quick start](README.md#quick-start))

### Getting started

```bash
git clone https://github.com/sarangkharche/Intertool.git
cd Intertool
npm install
cp .env.example .env.local
# Edit .env.local with your GitHub OAuth credentials
npm run dev
```

### Project overview

Intertool is a Next.js 16 App Router application. Key areas:

- `app/` — Routes and API endpoints
- `components/` — React components (shadcn/ui primitives in `components/ui/`)
- `lib/` — Core logic (auth, S3 registry, settings, RBAC)
- `cli/` — The `intertool` CLI package
- `content/docs/` — Documentation (MDX, served via Fumadocs at `/docs`)

For detailed architecture, see the [Architecture docs](content/docs/architecture.mdx) or run the app and visit `/docs`.

## How to submit changes

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Run checks:
   ```bash
   npm run lint
   npm run typecheck
   npm run format:check
   ```
4. Open a pull request against `master`

## Code style

- **Prettier** for formatting (config in `.prettierrc`)
- **ESLint** for linting (config in `eslint.config.mjs`)
- Run `npm run format` to auto-format before committing

## CLI changes

The CLI lives in `cli/`. If you change CLI commands:

1. Update `content/docs/cli-reference.mdx`
2. Build the CLI: `cd cli && npm run build`
3. Test locally: `node cli/dist/index.js <command>`

## Documentation

Docs are MDX files in `content/docs/`. When changing user-facing behavior, update the corresponding docs. Sidebar order is controlled by `content/docs/meta.json`.

## Reporting bugs

Use [GitHub Issues](https://github.com/sarangkharche/Intertool/issues) with the bug report template.

## Suggesting features

Use [GitHub Issues](https://github.com/sarangkharche/Intertool/issues) with the feature request template.
