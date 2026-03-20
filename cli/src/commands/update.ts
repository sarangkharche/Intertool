import { Command } from "commander";
import { dim } from "../lib/format.js";

export const updateCommand = new Command("update")
  .description("Update installed skills to latest versions")
  .action(async () => {
    console.log(dim("Update checking is not yet available."));
    console.log(dim("Re-run `intertool install <name>` to get the latest version."));
  });
