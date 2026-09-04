import { expect, test } from "@playwright/test";

test.describe("public memory surface", () => {
  test("serves agent-safe MCP installation instructions", async ({
    request,
  }) => {
    const response = await request.get("/install");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const body = await response.text();
    expect(body).toContain("# Install the Intertool MCP");
    expect(body).toContain("Never ask the user to paste an Intertool token");
    expect(body).toContain("[mcp_servers.intertool]");
    expect(body).toContain("grok mcp doctor intertool");
  });

  test("renders the unauthenticated home page", async ({ page }) => {
    test.setTimeout(60_000);
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const themedSurface = page.locator(".dashboard-theme").first();
    await expect(themedSurface).toBeVisible();
    await expect(themedSurface).not.toHaveClass(/dashboard-shell/);
    const heading = page.getByRole("heading", {
      name: "Reviewed engineering memory, now in every coding agent.",
    });
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).fontSize)
      )
    ).toBeGreaterThanOrEqual(32);
    await expect(heading).toHaveCSS("font-weight", "400");
    const hero = page.locator("#product");
    await expect(hero.locator("canvas")).toHaveCount(0);
    const installPicker = hero.locator("[data-install-picker]");
    await expect(
      installPicker.getByText(/Install the Intertool MCP in Claude Code/)
    ).toBeVisible();
    await expect(
      installPicker.getByRole("button", { name: "Copy install prompt" })
    ).toBeVisible();
    await expect(
      installPicker.getByRole("link", { name: /view claude code setup/i })
    ).toHaveAttribute("href", "/docs/getting-started#claude-code");
    const clientSelector = installPicker.getByRole("combobox", {
      name: "Select AI client",
    });
    await clientSelector.selectOption("codex");
    await expect(
      installPicker.getByText(/Install the Intertool MCP in Codex/)
    ).toBeVisible();
    await expect(installPicker.getByText("~/.codex/config.toml")).toBeVisible();
    await expect(
      installPicker.getByRole("link", { name: /view codex setup/i })
    ).toHaveAttribute(
      "href",
      "/docs/getting-started#chatgpt-desktop-and-codex"
    );
    await expect(
      page.getByRole("link", { name: "intertool", exact: true }).locator("svg")
    ).toBeVisible();
    const demo = page.locator("[data-interactive-demo]");
    await expect(demo).toBeVisible();
    const dependencyPrompt = demo.getByRole("button", {
      name: "Why does login depend on the profile service?",
    });
    await dependencyPrompt.click();
    await expect(dependencyPrompt).toHaveAttribute("aria-pressed", "true");
    await expect(demo.getByText("ADR-014")).toBeVisible();

    const capability = page.getByRole("tab", { name: "Find ownership" });
    await capability.click();
    await expect(capability).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByText("Tracing ownership and responsibility")
    ).toBeVisible();

    await expect(page.locator("main section")).toHaveCount(5);
    await expect(page.locator("main footer")).toBeVisible();
    await expect(page.locator("#scale, #context, #how-it-works")).toHaveCount(
      0
    );
    await expect(page.locator("[data-media-placeholder]")).toHaveCount(0);
    await expect(page.locator("main img")).toHaveCount(0);
    await expect(page.getByText("Enterprise", { exact: true })).toHaveCount(0);

    if ((page.viewportSize()?.width ?? 0) < 768) {
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Use (light|dark) theme/ })
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBe(true);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
    expect(browserErrors).toEqual([]);
    await expect(
      page.getByText("Intertool / shared engineering context")
    ).toHaveCount(0);
    await expect(
      page.getByText("Refund tests require ledger events")
    ).toHaveCount(0);
  });

  test("renders the sign-in page", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Sign in to Intertool" })
    ).toBeVisible();
    await expect(page.locator(".dashboard-theme").first()).toBeVisible();
    const homeLink = page.getByRole("link", {
      name: "Back to Intertool home",
    });
    await expect(homeLink).toHaveAttribute("href", "/");
    await expect(homeLink).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.getByRole("button", { name: "alice" })).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: "Reviewed engineering memory, now in every coding agent.",
      })
    ).toBeVisible();
  });

  test("serves public docs and LLM context endpoints", async ({ request }) => {
    const docs = await request.get("/docs");
    expect(docs.status()).toBeLessThan(500);
    await expect(docs).toBeOK();
    expect(await docs.text()).toContain("Intertool Documentation");

    const llms = await request.get("/llms.txt");
    await expect(llms).toBeOK();
    expect(llms.headers()["content-type"]).toContain("text/plain");
    expect(await llms.text()).toContain("Intertool Documentation");

    const llmsFull = await request.get("/llms-full.txt");
    await expect(llmsFull).toBeOK();
    const llmsFullText = await llmsFull.text();
    expect(llmsFullText).toContain("Development Context");
    expect(llmsFullText).toContain("Browser E2E Automation");
  });
});
