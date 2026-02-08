import type { Command } from "commander";
import chalk from "chalk";
import {
  checkAndUpdateHost,
  getHost,
  HostError,
  HostErrorCode,
  type CheckHostResult,
} from "@/core/host";

interface CheckOptions {
  json?: boolean;
}

function formatCheckResult(result: CheckHostResult, ssh: string, root: string): string {
  const lines: string[] = [];

  lines.push(`Checking ${result.host} (${ssh}:${root})...`);

  if (result.checks.ssh.ok) {
    lines.push(`  ${chalk.green("✓")} SSH connection`);
  } else {
    lines.push(`  ${chalk.red("✗")} SSH connection: ${result.checks.ssh.error}`);
  }

  if (result.checks.ssh.ok) {
    if (result.checks.directories.ok) {
      lines.push(`  ${chalk.green("✓")} Directory structure`);
    } else {
      lines.push(`  ${chalk.red("✗")} Directory structure: ${result.checks.directories.error || "failed"}`);
    }

    if (result.checks.git.ok) {
      lines.push(`  ${chalk.green("✓")} git ${result.checks.git.version}`);
    } else {
      lines.push(`  ${chalk.red("✗")} git: ${result.checks.git.error || "not found"}`);
    }

    if (result.checks.node.ok) {
      lines.push(`  ${chalk.green("✓")} node ${result.checks.node.version}`);
    } else {
      lines.push(`  ${chalk.yellow("⚠")} node not found (optional)`);
    }
  }

  return lines.join("\n");
}

export function registerHostCheckCommand(parent: Command) {
  parent
    .command("check")
    .description("Test connectivity and capabilities of a host")
    .argument("<name>", "Host to check")
    .option("--json", "Output result as JSON")
    .action(async (name: string, options: CheckOptions) => {
      try {
        const host = await getHost(name);
        if (!host) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: `Host "${name}" not found` }, null, 2));
          } else {
            console.error(chalk.red(`Error: Host "${name}" not found`));
          }
          process.exit(1);
        }

        const result = await checkAndUpdateHost(name);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatCheckResult(result, host.ssh, host.root));
          console.log();

          if (result.ok) {
            console.log(chalk.green(`Host "${name}" is ready.`));
          } else {
            console.log(chalk.red(`Host "${name}" check failed.`));
          }
        }

        if (!result.ok) {
          if (!result.checks.ssh.ok) {
            process.exit(2);
          }
          process.exit(3);
        }
      } catch (error) {
        if (error instanceof HostError) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
          } else {
            console.error(chalk.red(`Error: ${error.message}`));
          }
          process.exit(error.code === HostErrorCode.HOST_NOT_FOUND ? 1 : 1);
        }
        throw error;
      }
    });
}
