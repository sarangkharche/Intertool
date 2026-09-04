import { expect, test } from "@playwright/test";

test.describe("memory workflow", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Mutation workflow runs once against the shared seed"
  );

  test("Alice creates, reviews, and publishes a sourced memory", async ({
    page,
  }) => {
    await page.goto("/sign-in?callbackUrl=/dashboard");
    await page.getByRole("button", { name: "alice" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: /context your team/i })
    ).toBeVisible();

    await page.goto("/settings/tokens");
    await expect(
      page.getByRole("heading", { name: "Install with your agent" })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "ChatGPT + Codex", selected: true })
    ).toBeVisible();
    await expect(page.getByText("[mcp_servers.intertool]")).toBeVisible();
    await page.getByRole("tab", { name: "GitHub Copilot" }).click();
    await expect(
      page.getByText(/copilot mcp add --transport http/)
    ).toBeVisible();
    await page.getByRole("tab", { name: "Grok" }).click();
    await expect(page.getByText(/grok mcp add --transport http/)).toBeVisible();

    await page.goto("/my-memory");
    await expect(
      page.getByRole("heading", { name: "My memory", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Private vault", { exact: true })).toHaveCount(
      0
    );

    await page.goto("/memories");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText("Knowledge ledger", { exact: true })
    ).toHaveCount(0);

    await page.goto("/memories/new");
    await expect(
      page.getByText("Human-reviewed context", { exact: true })
    ).toHaveCount(0);
    const title = `Refund tests require ledger events ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page
      .getByRole("combobox", { name: "Repository", exact: true })
      .selectOption({ label: "acme/payments-service" });
    await page
      .getByLabel("Memory")
      .fill(
        "Run Redis and set ENABLE_LEDGER_EVENTS=true before refund integration tests."
      );
    await page.getByLabel("Path scopes").fill("tests/refunds/**");
    await page.getByLabel("Tags").fill("tests, redis");
    await page.getByLabel("Source label").fill("PR #1842");
    await page
      .getByLabel("Source URL")
      .fill("https://github.com/acme/payments-service/pull/1842");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Publish memory" }).click();
    await expect(page.getByText("published", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /PR #1842/ })).toBeVisible();
  });

  test("Alice imports and searches private personal memory", async ({
    page,
  }) => {
    const suffix = Date.now();
    const title = `Private Codex note ${suffix}`;
    const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "3001";
    const imported = await page.request.post(
      `http://127.0.0.1:${apiPort}/api/personal-memories/import`,
      {
        headers: {
          "x-intertool-dev-user": "alice",
          "x-intertool-dev-org": "acme",
        },
        data: {
          source_kind: "codex_local",
          source_key: `e2e/${suffix}.md`,
          title,
          content:
            "This personal test document must stay outside published team retrieval.",
        },
      }
    );
    expect(imported.status()).toBe(201);

    await page.goto("/sign-in?callbackUrl=/my-memory");
    await page.getByRole("button", { name: "alice" }).click();
    await expect(page).toHaveURL(/\/my-memory$/);
    await expect(
      page.getByRole("heading", { name: "My memory", exact: true })
    ).toBeVisible();
    await page.goto(`/my-memory?query=${encodeURIComponent(title)}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Private by default")).toBeVisible();
  });

  test("a fresh local user completes onboarding", async ({ page }) => {
    const suffix = Date.now();
    const user = `e2e-${suffix}`;
    await page.goto("/sign-in?callbackUrl=/onboarding");
    await page.getByLabel("Development username").fill(user);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "Create your team space" })
    ).toBeVisible();

    await page.getByLabel("Organisation name").fill(`E2E ${suffix}`);
    await page.getByLabel("URL slug").fill(`e2e-${suffix}`);
    await page.getByRole("button", { name: "Create organisation" }).click();
    await expect(
      page.getByRole("heading", { name: "Register a repository" })
    ).toBeVisible();

    await page
      .getByLabel("GitHub repository")
      .fill("https://example.com/acme/payments-service");
    await page.getByRole("button", { name: "Register repository" }).click();
    await expect(
      page.getByText("Enter owner/repository or its GitHub URL", {
        exact: true,
      })
    ).toBeVisible();

    await page
      .getByLabel("GitHub repository")
      .fill("https://github.com/sarangkharche/Intertool");
    await page.getByRole("button", { name: "Register repository" }).click();
    await expect(
      page.getByRole("heading", { name: "Connect Claude Code" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Create personal token" }).click();
    await expect(
      page.getByText("Copy this token now—it will not be shown again.")
    ).toBeVisible();
  });
});
