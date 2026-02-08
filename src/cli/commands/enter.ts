import type { Command } from "commander";
import chalk from "chalk";
import { SandboxError } from "@/core/sandbox/types";
import { requireSandbox } from "@/core/sandbox/state";
import { enterSandbox, enterSandboxTmux } from "@/core/sandbox/enter";

interface EnterOptions {
  json?: boolean;
  tmux?: boolean;
}

export function registerEnterCommand(program: Command) {
  program
    .command("enter")
    .description("Enter an existing sandbox")
    .argument("<name>", "Sandbox name")
    .option("--json", "Output sandbox record as JSON without entering")
    .option("--tmux", "Attach or create a tmux session in the sandbox")
    .action(async (name: string, options: EnterOptions) => {
      try {
        if (options.json) {
          const entry = await requireSandbox(name);
          console.log(JSON.stringify(entry, null, 2));
          return;
        }

        if (options.tmux) {
          await enterSandboxTmux(name);
        } else {
          await enterSandbox(name);
        }
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
