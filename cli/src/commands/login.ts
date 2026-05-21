import { Command } from "commander";
import { saveConfig, getConfig } from "../lib/config.js";
import { createServer } from "http";
import { exec } from "child_process";
import { platform } from "os";
import { bold, dim, check, cross, isJsonMode, spinner } from "../lib/format.js";

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
  .addHelpText(
    "after",
    `
Examples:
  $ intertool login --url https://registry.example.com
  $ intertool login --url https://registry.example.com --token itk_abc123
`
  )
  .action(async (opts) => {
    const jsonMode = isJsonMode();

    // If just setting URL without auth
    if (opts.url && !opts.token) {
      const config = getConfig();
      const hadUrl = config.apiUrl !== "http://localhost:3000";

      saveConfig({ apiUrl: opts.url });

      if (config.token && hadUrl) {
        if (jsonMode) {
          console.log(
            JSON.stringify({
              authenticated: true,
              apiUrl: opts.url,
              token_preserved: true,
            })
          );
          return;
        }
        console.log(check(`Updated API URL to ${bold(opts.url)}`));
        return;
      }

      // Start browser auth flow
      const result = await browserAuth(opts.url);
      if (jsonMode) {
        console.log(JSON.stringify(result));
      }
      if (!result.authenticated) process.exit(1);
      return;
    }

    // Manual token flow
    if (opts.token) {
      const updates: Record<string, string> = { token: opts.token };
      if (opts.url) updates.apiUrl = opts.url;
      saveConfig(updates);
      if (jsonMode) {
        console.log(
          JSON.stringify({
            authenticated: true,
            token_saved: true,
            apiUrl: opts.url ?? getConfig().apiUrl,
          })
        );
        return;
      }
      console.log(check("Token saved."));
      return;
    }

    // No args — show current config or help
    const config = getConfig();
    if (config.token) {
      if (jsonMode) {
        console.log(
          JSON.stringify({
            authenticated: true,
            apiUrl: config.apiUrl,
          })
        );
        return;
      }
      console.log(`  ${dim("URL:")}    ${config.apiUrl}`);
      console.log(`  ${dim("Token:")}  ${"*".repeat(8)}`);
      console.log(
        dim(`\nRun 'intertool login --url <url>' to change instance.`)
      );
    } else {
      if (jsonMode) {
        console.log(JSON.stringify({ authenticated: false }));
        process.exit(1);
      }
      console.log(dim("Not logged in.\n"));
      console.log(
        `  intertool login --url https://your-instance.com   ${dim("# Browser auth")}`
      );
      console.log(
        `  intertool login --url <url> --token <key>         ${dim("# API key auth")}`
      );
    }
  });

async function browserAuth(apiUrl: string): Promise<{
  authenticated: boolean;
  apiUrl: string;
  username?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    let s: ReturnType<typeof spinner>;
    let settled = false;

    function finish(result: {
      authenticated: boolean;
      apiUrl: string;
      username?: string;
      error?: string;
    }) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close(() => resolve(result));
    }

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

          s?.stop(
            check(`Authenticated${username ? ` as ${bold(username)}` : ""}`)
          );
          if (!isJsonMode()) {
            console.log(dim(`  Instance: ${apiUrl}`));
          }

          finish({
            authenticated: true,
            apiUrl,
            username: username ?? undefined,
          });
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Authentication failed — no token received.");
          s?.stop(cross("Authentication failed. No token received."));
          finish({
            authenticated: false,
            apiUrl,
            error: "Authentication failed. No token received.",
          });
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
        console.error(cross("Failed to start local server"));
        finish({
          authenticated: false,
          apiUrl,
          error: "Failed to start local server",
        });
        return;
      }

      const port = addr.port;
      const authUrl = `${apiUrl}/api/cli-auth?port=${port}`;

      s = spinner("Waiting for browser authentication...");
      const openMessage = `If it doesn't open, visit: ${authUrl}`;
      if (isJsonMode()) {
        console.error(openMessage);
      } else {
        console.log(dim(openMessage));
      }
      openBrowser(authUrl);
    });

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      s?.stop(cross("Authentication timed out."));
      finish({
        authenticated: false,
        apiUrl,
        error: "Authentication timed out.",
      });
    }, 120_000);
  });
}
