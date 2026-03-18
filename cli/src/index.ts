#!/usr/bin/env node

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { searchCommand } from "./commands/search.js";
import { installCommand } from "./commands/install.js";
import { publishCommand } from "./commands/publish.js";
import { updateCommand } from "./commands/update.js";

const program = new Command();

program
  .name("intertool")
  .description("CLI for the Intertool agent skill registry")
  .version("1.0.0");

program.addCommand(loginCommand);
program.addCommand(searchCommand);
program.addCommand(installCommand);
program.addCommand(publishCommand);
program.addCommand(updateCommand);

program.parse();
