import { Command } from "commander";
import { apiGet } from "../lib/api.js";
import { getConfig } from "../lib/config.js";
import { check, cross, bold, dim, isJsonMode } from "../lib/format.js";

export const whoamiCommand = new Command("whoami")
  .description("Show current authentication status")
  .action(async () => {
    const config = getConfig();

    if (!config.token) {
      if (isJsonMode()) {
        console.log(JSON.stringify({ authenticated: false }));
      } else {
        console.log(cross("Not logged in."));
        console.log(dim(`Run: intertool login --url <url>`));
      }
      process.exit(1);
    }

    try {
      const me = (await apiGet("/api/me")) as {
        username: string;
      };

      if (isJsonMode()) {
        console.log(
          JSON.stringify({ authenticated: true, username: me.username, apiUrl: config.apiUrl })
        );
      } else {
        console.log(check(`Logged in as ${bold(me.username)}`));
        console.log(dim(`  Registry: ${config.apiUrl}`));
      }
    } catch {
      if (isJsonMode()) {
        console.log(JSON.stringify({ authenticated: false, error: "Token invalid or expired" }));
      } else {
        console.log(cross("Token invalid or expired."));
        console.log(dim(`Run: intertool login --url <url>`));
      }
      process.exit(1);
    }
  });
