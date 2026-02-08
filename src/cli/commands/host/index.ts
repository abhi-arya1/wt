import type { Command } from "commander";
import { registerHostAddCommand } from "@/cli/commands/host/add";
import { registerHostLsCommand } from "@/cli/commands/host/ls";
import { registerHostCheckCommand } from "@/cli/commands/host/check";
import { registerHostRmCommand } from "@/cli/commands/host/rm";

export function registerHostCommand(program: Command) {
  const hostCmd = program
    .command("host")
    .description("Manage remote compute hosts");

  registerHostAddCommand(hostCmd);
  registerHostLsCommand(hostCmd);
  registerHostCheckCommand(hostCmd);
  registerHostRmCommand(hostCmd);
}
