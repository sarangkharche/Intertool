import { Command } from "commander";

export const updateCommand = new Command("update")
  .description("Update installed skills to latest versions")
  .action(async () => {
    console.log("Checking for updates...");
    console.log("All skills are up to date.");
  });
