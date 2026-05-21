import { Command } from "commander";
import { clearToken, getConfig } from "../lib/config.js";
import { check, dim, isJsonMode } from "../lib/format.js";

export const logoutCommand = new Command("logout")
  .description("Clear stored credentials")
  .action(() => {
    const config = getConfig();

    if (!config.token) {
      if (isJsonMode()) {
        console.log(
          JSON.stringify({ logged_out: false, authenticated: false })
        );
        return;
      }
      console.log(dim("Already logged out."));
      return;
    }

    clearToken();
    if (isJsonMode()) {
      console.log(JSON.stringify({ logged_out: true, authenticated: false }));
      return;
    }
    console.log(check("Logged out. Token cleared."));
  });
