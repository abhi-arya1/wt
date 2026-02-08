import type { Command } from "commander";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { ExitPromptError } from "@inquirer/core";
import { garbageCollect } from "@/core/sandbox/gc";

interface GcOptions {
  host?: string;
  olderThan: string;
  dryRun?: boolean;
  yes?: boolean;
  json?: boolean;
}

export function registerGcCommand(program: Command) {
  program
    .command("gc")
    .description("Remove stale sandboxes")
    .option("-H, --host <hostName>", "Target host (omit for all hosts)")
    .option("--older-than <duration>", "Age threshold (e.g. 7d, 24h, 1w)", "7d")
    .option("--dry-run", "Show what would be deleted without deleting")
    .option("-y, --yes", "Skip confirmation prompt")
    .option("--json", "Output as JSON")
    .action(async (options: GcOptions) => {
      try {
        const preview = await garbageCollect({
          hostName: options.host,
          olderThan: options.olderThan,
          dryRun: true,
        });

        if (options.json && options.dryRun) {
          console.log(JSON.stringify(preview, null, 2));
          return;
        }

        if (preview.deleted.length === 0 && preview.errors.length === 0) {
          if (options.json) {
            console.log(JSON.stringify(preview, null, 2));
          } else {
            console.log(chalk.dim("Nothing to clean up."));
          }
          return;
        }

        if (options.dryRun) {
          if (preview.deleted.length > 0) {
            console.log(`Would delete ${preview.deleted.length} sandbox(es)`);
            for (const e of preview.deleted) {
              console.log(`  ${chalk.red("-")} ${e.name} (${e.host})`);
            }
          }
          return;
        }

        if (!options.json) {
          console.log(`Found ${preview.deleted.length} sandbox(es) to delete:`);
          for (const e of preview.deleted) {
            console.log(`  ${chalk.red("-")} ${e.name} (${e.host})`);
          }
        }

        if (!options.yes && !options.json) {
          const confirmed = await confirm({
            message: `Delete ${preview.deleted.length} sandbox(es)?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.dim("Cancelled."));
            return;
          }
        }

        const result = await garbageCollect({
          hostName: options.host,
          olderThan: options.olderThan,
          dryRun: false,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.deleted.length > 0) {
          console.log(`Deleted ${result.deleted.length} sandbox(es)`);
        }

        if (result.errors.length > 0) {
          for (const e of result.errors) {
            console.error(chalk.red(`Error (${e.sandbox}): ${e.error}`));
          }
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof ExitPromptError) {
          console.log(chalk.dim("\nCancelled."));
          process.exit(130);
        }
        if (options.json) {
          console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
        } else {
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        }
        process.exit(1);
      }
    });
}
