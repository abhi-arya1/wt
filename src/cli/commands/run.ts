import type { Command } from "commander";
import chalk from "chalk";
import { SandboxError } from "@/core/sandbox/types";
import { runInSandbox } from "@/core/sandbox/run";

interface RunOptions {
  json?: boolean;
  quiet?: boolean;
}

export function registerRunCommand(program: Command) {
  program
    .command("run")
    .description("Run a command in a sandbox")
    .argument("<name>", "Sandbox name")
    .argument("<cmd...>", "Command to run")
    .option("--json", "Capture output and return as JSON")
    .option("--quiet", "Suppress non-error output")
    .passThroughOptions()
    .action(async (name: string, cmd: string[], options: RunOptions) => {
      try {
        const filteredCmd = cmd[0] === "--" ? cmd.slice(1) : cmd;
        if (filteredCmd.length === 0) {
          console.error(chalk.red("Error: No command specified"));
          process.exit(1);
        }
        const result = await runInSandbox(name, filteredCmd, {
          capture: !!options.json,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.exitCode);
        }

        process.exit(result.exitCode);
      } catch (error) {
        if (error instanceof SandboxError) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
          } else if (!options.quiet) {
            console.error(chalk.red(`Error: ${error.message}`));
          }
          process.exit(1);
        }
        throw error;
      }
    });
}
