import type { Command } from "commander";
import chalk from "chalk";
import { listHosts, type HostConfig } from "@/core/host";

interface LsOptions {
  json?: boolean;
}

function formatStatus(status: string): string {
  switch (status) {
    case "ok":
      return chalk.green("ok");
    case "error":
      return chalk.red("error");
    default:
      return chalk.dim("unchecked");
  }
}

function formatPortMappings(host: HostConfig): string {
  if (!host.portMappings || host.portMappings.length === 0) {
    return chalk.dim("-");
  }
  return host.portMappings.map((m) => `${m.localPort}:${m.hostPort}`).join(", ");
}

function pad(str: string, width: number): string {
  return str.padEnd(width);
}

export function registerHostLsCommand(parent: Command) {
  parent
    .command("ls")
    .description("List all configured hosts")
    .option("--json", "Output as JSON")
    .action(async (options: LsOptions) => {
      const result = await listHosts();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.hosts.length === 0) {
        console.log(chalk.dim("No hosts configured. Run `wt host add` to add one."));
        return;
      }

      const nameWidth = Math.max(4, ...result.hosts.map((h) => h.name.length)) + 2;
      const sshWidth = Math.max(3, ...result.hosts.map((h) => h.ssh.length)) + 2;
      const rootWidth = Math.max(4, ...result.hosts.map((h) => h.root.length)) + 2;
      const portsWidth = Math.max(5, ...result.hosts.map((h) => formatPortMappings(h).length)) + 2;

      console.log(
        chalk.bold(
          pad("NAME", nameWidth) +
            pad("SSH", sshWidth) +
            pad("ROOT", rootWidth) +
            pad("PORTS", portsWidth) +
            pad("DEFAULT", 9) +
            "STATUS",
        ),
      );

      for (const host of result.hosts) {
        const isDefault = host.name === result.defaultHost;
        const defaultMark = isDefault ? chalk.cyan("*") : chalk.dim("-");

        console.log(
          pad(host.name, nameWidth) +
            pad(host.ssh, sshWidth) +
            pad(host.root, rootWidth) +
            pad(formatPortMappings(host), portsWidth) +
            pad(defaultMark, 9) +
            formatStatus(host.lastStatus),
        );
      }
    });
}
