import { expect, test } from "@playwright/test";

test.describe("public memory surface", () => {
  test("renders the unauthenticated home page", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const themedSurface = page.locator(".dashboard-theme").first();
    await expect(themedSurface).toBeVisible();
    await expect(themedSurface).not.toHaveClass(/dashboard-shell/);
    const heading = page.getByRole("heading", {
      name: "Engineering memory for every team and every coding agent.",
    });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS("font-size", "18px");
    await expect(heading).toHaveCSS("font-weight", "500");
    const hero = page.locator("#product");
    await expect(
      hero.getByRole("link", { name: /open intertool/i })
    ).toHaveAttribute("href", "/sign-in");
    await expect(
      hero.getByRole("link", { name: /see how it scales/i })
    ).toHaveAttribute("href", "#scale");
    await expect(hero.getByText("/intertool:remember")).toBeVisible();
    await expect(
      hero.getByRole("button", { name: "Copy command" })
    ).toBeVisible();
    await expect(
      hero.getByRole("link", { name: /connect claude code/i })
    ).toHaveAttribute("href", "/docs/getting-started");
    await expect(
      page.getByRole("link", { name: "intertool", exact: true }).locator("svg")
    ).toBeVisible();
    await expect(page.locator("[data-hero-placeholder]")).toBeVisible();
    await expect(page.locator("[data-media-placeholder]")).toHaveCount(2);
    await expect(page.locator("main img")).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Start with one team. Keep the controls as you scale.",
      })
    ).toBeVisible();
    await expect(page.getByText("Enterprise", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Controls that stay in place as the organisation grows.",
      })
    ).toBeVisible();
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
      page.getByRole("heading", { name: "Memory that keeps its evidence." })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Capture once. Confirm deliberately. Retrieve when it matters.",
      })
    ).toBeVisible();
    await expect(page.locator("main .eyebrow, main .uppercase")).toHaveCount(0);
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
        name: "Engineering memory for every team and every coding agent.",
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
