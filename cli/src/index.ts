#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loginCommand } from "./commands/login.js";
import { searchCommand } from "./commands/search.js";
import { installCommand } from "./commands/install.js";
import { publishCommand } from "./commands/publish.js";
import { updateCommand } from "./commands/update.js";
import { whoamiCommand } from "./commands/whoami.js";
import { logoutCommand } from "./commands/logout.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";
import { infoCommand } from "./commands/info.js";
import { red } from "./lib/format.js";

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("intertool")
  .description("CLI for the Intertool agent skill registry")
  .version(pkg.version)
  .option("--json", "Output as JSON (for CI/CD)")
  .addHelpText("after", `
Examples:
  $ intertool login --url https://registry.example.com
  $ intertool search "code review"
  $ intertool install @team/my-skill
  $ intertool publish SKILL.md
  $ intertool list
  $ intertool info my-skill
  $ intertool whoami
`);

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(removeCommand);
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(publishCommand);
program.addCommand(updateCommand);

// Show help when run with no arguments
if (process.argv.length <= 2) {
  program.help();
}

// Global error boundary
process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(red(`Error: ${msg}`));
  process.exit(1);
});

program.parse();
