import type { Command } from "commander";
import chalk from "chalk";
import { LOCAL_HOST_NAME, getDefaultHost } from "@/core/host/config";
import { runDoctor } from "@/core/sandbox/doctor";

interface DoctorOptions {
  host?: string;
  json?: boolean;
}

export function registerDoctorCommand(program: Command) {
  program
    .command("doctor")
    .description("Check system prerequisites and host health")
    .option("-H, --host <hostName>", "Target host")
    .option("--json", "Output as JSON")
    .action(async (options: DoctorOptions) => {
      let hostName: string;
      if (options.host) {
        hostName = options.host;
      } else {
        const defaultHost = await getDefaultHost();
        hostName = defaultHost?.name ?? LOCAL_HOST_NAME;
      }

      const result = await runDoctor(hostName);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      for (const check of result.checks) {
        if (check.ok) {
          console.log(`  ${chalk.green("✓")} ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
        } else {
          console.log(`  ${chalk.red("✗")} ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
        }
      }

      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.log(`  ${chalk.yellow("⚠")} ${w}`);
        }
      }

      console.log();
      if (result.ok) {
        console.log(chalk.green(`Host "${hostName}" is healthy.`));
      } else {
        console.log(chalk.red(`Host "${hostName}" has issues.`));
        process.exit(1);
      }
    });
}
