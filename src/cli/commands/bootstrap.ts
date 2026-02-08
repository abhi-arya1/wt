import type { Command } from "commander";
import chalk from "chalk";
import { SandboxError } from "@/core/sandbox/types";
import { bootstrapHost } from "@/core/sandbox/bootstrap";

interface BootstrapOptions {
  host: string;
  tmux?: boolean;
  agents?: string;
  json?: boolean;
}

export function registerBootstrapCommand(program: Command) {
  program
    .command("bootstrap")
    .description("Check host readiness and report missing packages")
    .requiredOption("-H, --host <hostName>", "Target host")
    .option("--tmux", "Include tmux in checks")
    .option("--agents <list>", "Comma-separated agent CLIs to check (e.g. claude,opencode)")
    .option("--json", "Output as JSON")
    .action(async (options: BootstrapOptions) => {
      try {
        const agents = options.agents
          ? options.agents.split(",").map((a) => a.trim()).filter(Boolean)
          : [];

        const result = await bootstrapHost({
          hostName: options.host,
          tmux: !!options.tmux,
          agents,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          if (!result.ok) process.exit(1);
          return;
        }

        for (const check of result.checks) {
          if (check.ok) {
            console.log(`  ${chalk.green("✓")} ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
          } else {
            console.log(`  ${chalk.red("✗")} ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
          }
        }

        if (result.missing.length > 0) {
          console.log();
          console.log(chalk.yellow(`Missing: ${result.missing.join(", ")}`));
        }

        if (result.instructions.length > 0) {
          console.log();
          console.log(chalk.dim("Install instructions:"));
          for (const inst of result.instructions) {
            console.log(`  ${inst}`);
          }
        }

        console.log();
        if (result.ok) {
          console.log(chalk.green(`Host "${options.host}" is ready.`));
        } else {
          console.log(chalk.red(`Host "${options.host}" is not ready.`));
          process.exit(1);
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
