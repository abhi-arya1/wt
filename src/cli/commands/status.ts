import type { Command } from "commander";
import chalk from "chalk";
import { getSandboxStatus } from "@/core/sandbox/status";
import { SandboxError } from "@/core/sandbox/types";

interface StatusOptions {
  json?: boolean;
}

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Show sandbox status")
    .argument("<name>", "Sandbox name")
    .option("--json", "Output as JSON")
    .action(async (name: string, options: StatusOptions) => {
      try {
        const status = await getSandboxStatus(name);

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        const { entry, dirExists, tmuxSession, age } = status;

        console.log(chalk.bold(entry.name));
        console.log(`  ${"ID".padEnd(10)} ${chalk.dim(entry.id)}`);
        console.log(`  ${"Host".padEnd(10)} ${entry.host}`);
        console.log(`  ${"Ref".padEnd(10)} ${chalk.yellow(entry.ref.substring(0, 8))}`);
        console.log(`  ${"Origin".padEnd(10)} ${chalk.dim(entry.origin)}`);
        console.log(`  ${"Path".padEnd(10)} ${entry.path}`);
        console.log(`  ${"Age".padEnd(10)} ${age}`);

        const dirLabel = dirExists
          ? chalk.green("exists")
          : chalk.red("missing");
        console.log(`  ${"Dir".padEnd(10)} ${dirLabel}`);

        const tmuxLabel = tmuxSession
          ? chalk.green(tmuxSession)
          : chalk.dim("none");
        console.log(`  ${"Tmux".padEnd(10)} ${tmuxLabel}`);
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
