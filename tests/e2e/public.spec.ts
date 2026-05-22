import { expect, test } from "@playwright/test";

test.describe("public registry surface", () => {
  test("renders the unauthenticated home page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        name: "Govern agent capabilities.",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /deploy self-hosted/i })
    ).toHaveAttribute("href", "/docs/getting-started");
    await expect(page.getByText("Private agent registry")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /where it fits/i })
    ).toHaveAttribute("href", "#where-it-fits");
  });

  test("renders the public pricing page", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        name: "Start with private approval. Scale into agent governance.",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Not another native skill store" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Community" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Team Cloud", exact: true })
    ).toBeVisible();
  });

  test("renders the sign-in page", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Sign in to Intertool" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with github/i })
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
