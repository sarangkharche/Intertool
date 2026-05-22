import { expect, test } from "@playwright/test";

function targetOrigin(baseURL: string | undefined): string {
  return new URL(baseURL ?? "http://127.0.0.1:3000").origin;
}

function isSaasTarget(baseURL: string | undefined): boolean {
  const origin = targetOrigin(baseURL);
  return (
    process.env.INTERTOOL_E2E_SAAS === "true" ||
    origin === "https://intertool.sh"
  );
}

function setCookieHeaders(response: {
  headersArray(): { name: string; value: string }[];
}) {
  return response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);
}

function hasExpiredCookie(setCookies: string[], name: string): boolean {
  return setCookies.some(
    (cookie) =>
      cookie.startsWith(`${name}=;`) &&
      /Max-Age=0/i.test(cookie) &&
      /Path=\//i.test(cookie)
  );
}

function locationPath(
  location: string | undefined,
  baseURL: string | undefined
) {
  return new URL(location ?? "/", targetOrigin(baseURL)).pathname;
}

test.describe("auth routing and logout", () => {
  test("logout clears browser cookies and lands on a safe callback", async ({
    baseURL,
    context,
    page,
  }) => {
    const origin = targetOrigin(baseURL);

    await context.addCookies([
      {
        name: "intertool.org",
        value: "acme",
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        name: "authjs.session-token",
        value: "local-session",
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/logout?callbackUrl=%2Fpricing", {
      waitUntil: "domcontentloaded",
    });

    await expect.poll(() => new URL(page.url()).pathname).toBe("/pricing");
    const cookies = await context.cookies(origin);
    expect(cookies.map((cookie) => cookie.name)).not.toContain("intertool.org");
    expect(cookies.map((cookie) => cookie.name)).not.toContain(
      "authjs.session-token"
    );
  });

  test("logout response expires auth and org cookies server-side", async ({
    baseURL,
    request,
  }) => {
    const response = await request.get("/logout?callbackUrl=%2Fpricing", {
      headers: {
        cookie:
          "intertool.org=acme; authjs.session-token=local; __Secure-authjs.session-token=secure; __Secure-authjs.session-token.0=chunk; __Host-authjs.csrf-token=csrf",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(locationPath(response.headers()["location"], baseURL)).toBe(
      "/pricing"
    );
    expect(response.headers()["cache-control"]).toContain("no-store");

    const setCookies = setCookieHeaders(response);
    expect(hasExpiredCookie(setCookies, "intertool.org")).toBe(true);
    expect(hasExpiredCookie(setCookies, "authjs.session-token")).toBe(true);
    expect(hasExpiredCookie(setCookies, "__Secure-authjs.session-token")).toBe(
      true
    );
    expect(
      hasExpiredCookie(setCookies, "__Secure-authjs.session-token.0")
    ).toBe(true);
    expect(hasExpiredCookie(setCookies, "__Host-authjs.csrf-token")).toBe(true);
  });

  test("logout rejects external callback URLs", async ({ page }) => {
    await page.goto(
      "/logout?callbackUrl=https%3A%2F%2Fevil.example%2Fdashboard",
      { waitUntil: "domcontentloaded" }
    );

    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    expect(new URL(page.url()).hostname).not.toBe("evil.example");
  });

  test("SaaS stale default paths collapse to a clean sign-in callback", async ({
    baseURL,
    request,
  }) => {
    test.skip(!isSaasTarget(baseURL), "SaaS-only production routing behavior");

    for (const path of [
      "/default/dashboard",
      "/default/default/dashboard",
      "/default/default/default/default/dashboard",
      "/default/sign-in?callbackUrl=%2Fdefault%2Fdefault%2Fdashboard",
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      expect(response.headers()["location"], path).toBe(
        "/sign-in?callbackUrl=%2Fdashboard"
      );
      expect(response.headers()["cache-control"], path).toContain("no-store");
      const setCookies = setCookieHeaders(response);
      expect(hasExpiredCookie(setCookies, "intertool.org"), path).toBe(true);
    }
  });
});
