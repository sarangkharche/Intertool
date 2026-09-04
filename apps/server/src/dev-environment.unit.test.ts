import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("local development environment", () => {
  it("loads the root .env.local before starting the API service", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["dev:service"]).toContain(
      "--env-file=../../.env.local"
    );
  });

  it("documents the callback origin using the environment name Auth.js reads", async () => {
    const exampleEnvironment = await readFile(
      new URL("../../../.env.example", import.meta.url),
      "utf8"
    );

    expect(exampleEnvironment).toMatch(/^AUTH_URL=http:\/\/localhost:3000$/m);
  });

  it("defaults local commands to the Docker database unless explicitly overridden", async () => {
    const rootPackageJson = JSON.parse(
      await readFile(new URL("../../../package.json", import.meta.url), "utf8")
    ) as { scripts?: Record<string, string> };
    const localDatabase =
      "DATABASE_URL=${DATABASE_URL:-postgresql://intertool:intertool@localhost:5432/intertool}";

    for (const script of ["dev", "db:migrate", "db:seed", "test:integration"]) {
      expect(rootPackageJson.scripts?.[script]).toContain(localDatabase);
    }
  });
});
