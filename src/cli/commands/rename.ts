import type { Command } from "commander";
import chalk from "chalk";
import { renameSandbox } from "@/core/sandbox/state";
import { SandboxError } from "@/core/sandbox/types";

interface RenameOptions {
  json?: boolean;
}

export function registerRenameCommand(program: Command) {
  program
    .command("rename")
    .description("Rename a sandbox")
    .argument("<old>", "Current sandbox name")
    .argument("<new>", "New sandbox name")
    .option("--json", "Output result as JSON")
    .action(async (oldName: string, newName: string, options: RenameOptions) => {
      try {
        const entry = await renameSandbox(oldName, newName);

        if (options.json) {
          console.log(JSON.stringify(entry, null, 2));
          return;
        }

        console.log(chalk.green(`Renamed "${oldName}" -> "${newName}"`));
      } catch (error) {
        if (error instanceof SandboxError) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
          } else {
            console.error(chalk.red(`Error: ${error.message}`));
          }
          process.exit(1);
        }
        throw error;
      }
    });
}
