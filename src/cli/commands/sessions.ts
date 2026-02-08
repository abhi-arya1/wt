import type { Command } from "commander";
import chalk from "chalk";
import { LOCAL_HOST_NAME, getDefaultHost } from "@/core/host/config";
import { listWtSessions } from "@/core/sandbox/sessions";

interface SessionsOptions {
  host?: string;
  json?: boolean;
}

export function registerSessionsCommand(program: Command) {
  program
    .command("sessions")
    .description("List running tmux sessions for wt sandboxes")
    .option("-H, --host <hostName>", "Target host")
    .option("--json", "Output as JSON")
    .action(async (options: SessionsOptions) => {
      let hostName: string;
      if (options.host) {
        hostName = options.host;
      } else {
        const defaultHost = await getDefaultHost();
        hostName = defaultHost?.name ?? LOCAL_HOST_NAME;
      }

      const result = await listWtSessions(hostName);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.error(chalk.yellow(`Warning: ${w}`));
        }
      }

      if (result.sessions.length === 0) {
        console.log(chalk.dim("No active sessions."));
        return;
      }

      for (const s of result.sessions) {
        const mark = s.attached ? chalk.green("attached") : chalk.dim("detached");
        console.log(`${s.name}  ${mark}`);
      }
    });
}
