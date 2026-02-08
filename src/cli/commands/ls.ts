import type { Command } from "commander";
import chalk from "chalk";
import { listSandboxesFiltered } from "@/core/sandbox/ls";

interface LsOptions {
  host?: string;
  json?: boolean;
}

export function registerLsCommand(program: Command) {
  program
    .command("ls")
    .description("List sandboxes")
    .option("-H, --host <hostName>", "Filter by host")
    .option("--json", "Output as JSON")
    .action(async (options: LsOptions) => {
      try {
        const result = await listSandboxesFiltered({
          hostName: options.host,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.total === 0) {
          console.log(chalk.dim("No sandboxes found."));
          return;
        }

        const nameWidth = Math.max(...result.sandboxes.map((s) => s.name.length), 4);
        const hostWidth = Math.max(...result.sandboxes.map((s) => s.host.length), 4);
        const refWidth = Math.max(...result.sandboxes.map((s) => s.ref.substring(0, 8).length), 3);

        console.log(
          chalk.bold(
            `${"NAME".padEnd(nameWidth)}  ${"HOST".padEnd(hostWidth)}  ${"REF".padEnd(refWidth)}  CREATED`,
          ),
        );

        for (const s of result.sandboxes) {
          const ref = s.ref.substring(0, 8);
          const created = new Date(s.createdAt).toLocaleDateString();
          console.log(
            `${chalk.cyan(s.name.padEnd(nameWidth))}  ${s.host.padEnd(hostWidth)}  ${chalk.yellow(ref.padEnd(refWidth))}  ${chalk.dim(created)}`,
          );
        }

        console.log(chalk.dim(`\n${result.total} sandbox(es)`));
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
        } else {
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        }
        process.exit(1);
      }
    });
}
