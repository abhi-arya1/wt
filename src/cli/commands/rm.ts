import type { Command } from "commander";
import chalk from "chalk";
import { removeSandboxFull } from "@/core/sandbox/rm";
import { SandboxError } from "@/core/sandbox/types";

interface RmOptions {
  json?: boolean;
}

export function registerRmCommand(program: Command) {
  program
    .command("rm")
    .description("Remove a sandbox")
    .argument("<name>", "Sandbox name")
    .option("--json", "Output as JSON")
    .action(async (name: string, options: RmOptions) => {
      try {
        const result = await removeSandboxFull(name);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(`Removed sandbox ${chalk.cyan(result.entry.name)}`);

        const warnings: string[] = [];
        if (!result.cleaned.dir) warnings.push("directory");
        if (!result.cleaned.meta) warnings.push("metadata");
        if (warnings.length > 0) {
          console.log(chalk.yellow(`  Warning: could not clean ${warnings.join(", ")}`));
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
