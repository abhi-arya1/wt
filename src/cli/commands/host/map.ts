import type { Command } from "commander";
import chalk from "chalk";
import { getHost, updateHost, HostError, HostErrorCode } from "@/core/host";

interface MapOptions {
  json?: boolean;
}

export function registerHostMapCommand(parent: Command) {
  parent
    .command("map")
    .description("Add a port mapping to a host")
    .argument("<name>", "Host name")
    .argument("<localPort>", "Local port number")
    .argument("<hostPort>", "Remote host port number")
    .option("--json", "Output result as JSON")
    .action(async (name: string, localPortStr: string, hostPortStr: string, options: MapOptions) => {
      try {
        const localPort = parseInt(localPortStr, 10);
        const hostPort = parseInt(hostPortStr, 10);

        if (isNaN(localPort) || localPort < 1 || localPort > 65535) {
          throw new HostError(HostErrorCode.VALIDATION_ERROR, `Invalid local port: ${localPortStr}`);
        }

        if (isNaN(hostPort) || hostPort < 1 || hostPort > 65535) {
          throw new HostError(HostErrorCode.VALIDATION_ERROR, `Invalid host port: ${hostPortStr}`);
        }

        const host = await getHost(name);
        if (!host) {
          throw new HostError(HostErrorCode.HOST_NOT_FOUND, `Host "${name}" not found`);
        }

        const portMappings = host.portMappings ?? [];
        
        // Check if local port is already mapped
        const existingIndex = portMappings.findIndex((m) => m.localPort === localPort);
        const isUpdate = existingIndex !== -1;
        
        if (isUpdate) {
          portMappings[existingIndex] = { localPort, hostPort };
        } else {
          portMappings.push({ localPort, hostPort });
        }

        host.portMappings = portMappings;
        host.updatedAt = new Date().toISOString();
        await updateHost(host);

        const result = {
          ok: true,
          action: isUpdate ? "updated" : "added",
          host: name,
          mapping: { localPort, hostPort },
        };

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const action = isUpdate ? "Updated" : "Added";
          console.log(chalk.green(`${action} port mapping: localhost:${localPort} -> ${name}:${hostPort}`));
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
