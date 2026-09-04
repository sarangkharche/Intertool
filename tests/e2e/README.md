# Browser E2E tests

Playwright exercises the public site, guarded development authentication, onboarding, and the reviewed memory lifecycle.

## Run

```bash
docker compose up -d postgres
pnpm test:e2e:install
pnpm test:e2e
```

The managed run migrates and seeds PostgreSQL, starts Fastify on port 3001, and starts Next.js on port 3317 with an isolated `.next-playwright` directory. This means browser verification can run while a developer has the same checkout open on another port.

Set `PLAYWRIGHT_PORT` to choose another managed port. Set `PLAYWRIGHT_BASE_URL` only when intentionally testing an already-running target.

## Coverage map

- Public home, sign-in, documentation, and LLM context endpoints
- Safe logout callbacks and external-callback rejection
- Alice signing in, creating a repository-scoped sourced draft, and explicitly publishing it
- A fresh local identity reaching organisation onboarding
- Desktop and mobile public layouts

Protocol integration tests cover token authentication, revocation, tenant isolation, lifecycle exclusions, ranking, compaction, and the five MCP tools.

Prefer role and label locators. Add test IDs only when a control has no stable accessible name.
