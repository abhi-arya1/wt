import type { Command } from "commander";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { removeHost, getHost } from "@/core/host";

interface RmOptions {
  force?: boolean;
  json?: boolean;
}

export function registerHostRmCommand(parent: Command) {
  parent
    .command("rm")
    .description("Remove a host configuration")
    .argument("<name>", "Host to remove")
    .option("-f, --force", "Skip confirmation prompt")
    .option("--json", "Output result as JSON")
    .action(async (name: string, options: RmOptions) => {
      const host = await getHost(name);
      if (!host) {
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: `Host "${name}" not found` }, null, 2));
        } else {
          console.error(chalk.red(`Error: Host "${name}" not found`));
        }
        process.exit(1);
      }

      if (!options.force && !options.json) {
        const confirmed = await confirm({
          message: `Remove host "${name}" (${host.ssh})?`,
          default: false,
        });

        if (!confirmed) {
          console.log(chalk.dim("Cancelled."));
          return;
        }
      }

      const removed = await removeHost(name);

      if (options.json) {
        console.log(JSON.stringify({ ok: removed, removed: name }, null, 2));
      } else {
        console.log(chalk.green(`Removed host "${name}"`));
      }
    });
}
