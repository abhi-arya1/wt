import type { Command } from "commander";
import chalk from "chalk";
import { garbageCollect } from "@/core/sandbox/gc";

interface GcOptions {
  host?: string;
  olderThan: string;
  dryRun?: boolean;
  json?: boolean;
}

export function registerGcCommand(program: Command) {
  program
    .command("gc")
    .description("Remove stale sandboxes")
    .option("-H, --host <hostName>", "Target host (omit for all hosts)")
    .option("--older-than <duration>", "Age threshold (e.g. 7d, 24h, 1w)", "7d")
    .option("--dry-run", "Show what would be deleted without deleting")
    .option("--json", "Output as JSON")
    .action(async (options: GcOptions) => {
      try {
        const result = await garbageCollect({
          hostName: options.host,
          olderThan: options.olderThan,
          dryRun: !!options.dryRun,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const verb = options.dryRun ? "Would delete" : "Deleted";

        if (result.deleted.length === 0 && result.errors.length === 0) {
          console.log(chalk.dim("Nothing to clean up."));
          return;
        }

        if (result.deleted.length > 0) {
          console.log(`${verb} ${result.deleted.length} sandbox(es)`);
          for (const e of result.deleted) {
            console.log(`  ${chalk.red("-")} ${e.name} (${e.host})`);
          }
        }

        if (result.errors.length > 0) {
          for (const e of result.errors) {
            console.error(chalk.red(`Error (${e.sandbox}): ${e.error}`));
          }
          process.exit(1);
        }
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
