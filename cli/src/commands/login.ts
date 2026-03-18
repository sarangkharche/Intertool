import { Command } from "commander";
import { saveConfig, getConfig } from "../lib/config.js";
import { createServer } from "http";
import { exec } from "child_process";
import { platform } from "os";

function openBrowser(url: string) {
  const cmd =
    platform() === "darwin"
      ? "open"
      : platform() === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export const loginCommand = new Command("login")
  .description("Authenticate with your Intertool instance")
  .option("--url <url>", "Intertool instance URL")
  .option("--token <token>", "API key (skip browser flow)")
  .action(async (opts) => {
    // If just setting URL without auth
    if (opts.url && !opts.token) {
      const config = getConfig();
      const hadUrl = config.apiUrl !== "http://localhost:3000";

      saveConfig({ apiUrl: opts.url });

      if (config.token && hadUrl) {
        // Already has a token, just updating URL
        console.log(`Updated API URL to ${opts.url}`);
        return;
      }

      // Start browser auth flow
      await browserAuth(opts.url);
      return;
    }

    // Manual token flow
    if (opts.token) {
      const updates: Record<string, string> = { token: opts.token };
      if (opts.url) updates.apiUrl = opts.url;
      saveConfig(updates);
      console.log("Saved. Token configured for CLI access.");
      return;
    }

    // No args — show current config or start auth
    const config = getConfig();
    if (config.token) {
      console.log("Current config:");
      console.log(`  URL:   ${config.apiUrl}`);
      console.log(`  Token: ${"*".repeat(8)}`);
      console.log(`\nRun 'intertool login --url <url>' to change instance.`);
    } else {
      console.log("Not logged in.");
      console.log(`\nUsage:`);
      console.log(`  intertool login --url https://your-instance.com   # Browser auth`);
      console.log(`  intertool login --url <url> --token <key>         # API key auth`);
    }
  });

async function browserAuth(apiUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);

      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token");
        const username = url.searchParams.get("username");

        if (token) {
          saveConfig({ apiUrl, token });

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa;">
                <div style="text-align: center;">
                  <h2>Authenticated${username ? ` as ${username}` : ""}</h2>
                  <p style="color: #888;">You can close this tab and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          console.log(`\nAuthenticated${username ? ` as ${username}` : ""}!`);
          console.log(`Instance: ${apiUrl}`);

          server.close();
          resolve();
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Authentication failed — no token received.");
          server.close();
          resolve();
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Listen on random port
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        console.error("Failed to start local server");
        server.close();
        resolve();
        return;
      }

      const port = addr.port;
      const authUrl = `${apiUrl}/api/cli-auth?port=${port}`;

      console.log("Opening browser for authentication...");
      console.log(`If it doesn't open, visit: ${authUrl}\n`);
      openBrowser(authUrl);
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      console.error("\nAuthentication timed out.");
      server.close();
      resolve();
    }, 120_000);
  });
}
