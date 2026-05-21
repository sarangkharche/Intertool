# Browser E2E Tests

This suite uses Playwright to exercise the registry through the browser and HTTP request contexts.

## Run

```bash
npm run test:e2e:install
npm run test:e2e
```

Useful local modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

By default Playwright starts or reuses `npm run dev` on `127.0.0.1:3000`. To test another already-running deployment, set:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

## Authenticated Flows

Public smoke tests do not require OAuth or S3. Authenticated suites should store browser state in `tests/e2e/.auth/`, which is ignored by git:

```bash
mkdir -p tests/e2e/.auth
```

Use real OAuth only for manual debugging. Automated authenticated tests should prefer a deterministic setup path, such as a local test auth bypass guarded by `NODE_ENV === "test"` or seeded cookies produced by a setup project.

## Coverage Map

Add tests by product workflow, not by implementation file:

- Public discovery: `/`, `/browse`, `/search`, `/docs`, `/llms.txt`, `/llms-full.txt`
- Auth and onboarding: `/sign-in`, `/create-org`, `/invite`
- Admin setup: `/admin`, `/settings/admin`, S3 settings validation
- Publishing: upload `SKILL.md`, upload `server.json`, GitHub import, package files, validation errors, update existing item
- Registry item detail: install command copy, raw download, package file download, versions, diff view, edit flow
- CLI/API contract: publish through CLI, search through CLI, install package files, token auth, RBAC failures
- SaaS routing: `/{org}`, org cookie fallback for `/api/*`, reserved top-level paths, local SaaS fallback

Prefer role and label locators. Add `data-testid` only when a control has no stable accessible role or name.
