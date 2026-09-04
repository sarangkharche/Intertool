import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3317";
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "3001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const apiURL = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: `pnpm db:migrate && pnpm db:seed && PORT=${apiPort} pnpm --filter @intertool/server dev:service`,
          url: `${apiURL}/health`,
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
          timeout: 120_000,
          env: {
            DATABASE_URL:
              "postgresql://intertool:intertool@127.0.0.1:5432/intertool",
            AUTH_SECRET: "playwright-local-dev-secret",
            WEB_INTERNAL_SECRET: "playwright-internal-secret",
            DEV_AUTH_BYPASS: "true",
          },
        },
        {
          command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
          url: baseURL,
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
          timeout: 120_000,
          env: {
            DATABASE_URL:
              "postgresql://intertool:intertool@127.0.0.1:5432/intertool",
            SERVER_URL: apiURL,
            AUTH_URL: baseURL,
            AUTH_SECRET: "playwright-local-dev-secret",
            WEB_INTERNAL_SECRET: "playwright-internal-secret",
            AUTH_TRUST_HOST: "true",
            DEV_AUTH_BYPASS: "true",
            NEXT_DIST_DIR: ".next-playwright",
          },
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
