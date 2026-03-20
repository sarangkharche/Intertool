import { Command } from "commander";
import { clearToken, getConfig } from "../lib/config.js";
import { check, dim } from "../lib/format.js";

export const logoutCommand = new Command("logout")
  .description("Clear stored credentials")
  .action(() => {
    const config = getConfig();

    if (!config.token) {
      console.log(dim("Already logged out."));
      return;
    }

    clearToken();
    console.log(check("Logged out. Token cleared."));
  });
