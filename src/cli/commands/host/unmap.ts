import type { Command } from "commander";
import chalk from "chalk";
import { getHost, updateHost, HostError, HostErrorCode } from "@/core/host";

interface UnmapOptions {
  json?: boolean;
}

export function registerHostUnmapCommand(parent: Command) {
  parent
    .command("unmap")
    .description("Remove a port mapping from a host")
    .argument("<name>", "Host name")
    .argument("<localPort>", "Local port number to unmap")
    .option("--json", "Output result as JSON")
    .action(async (name: string, localPortStr: string, options: UnmapOptions) => {
      try {
        const localPort = parseInt(localPortStr, 10);

        if (isNaN(localPort) || localPort < 1 || localPort > 65535) {
          throw new HostError(HostErrorCode.VALIDATION_ERROR, `Invalid local port: ${localPortStr}`);
        }

        const host = await getHost(name);
        if (!host) {
          throw new HostError(HostErrorCode.HOST_NOT_FOUND, `Host "${name}" not found`);
        }

        const portMappings = host.portMappings ?? [];
        const existingIndex = portMappings.findIndex((m) => m.localPort === localPort);

        if (existingIndex === -1) {
          throw new HostError(
            HostErrorCode.VALIDATION_ERROR,
            `No mapping found for local port ${localPort} on host "${name}"`,
          );
        }

        const removed = portMappings[existingIndex];
        portMappings.splice(existingIndex, 1);

        host.portMappings = portMappings;
        host.updatedAt = new Date().toISOString();
        await updateHost(host);

        const result = {
          ok: true,
          host: name,
          removed: { localPort: removed.localPort, hostPort: removed.hostPort },
        };

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green(`Removed port mapping: localhost:${removed.localPort} -> ${name}:${removed.hostPort}`));
        }
      } catch (error) {
        if (error instanceof HostError) {
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
