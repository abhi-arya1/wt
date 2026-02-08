import type { Command } from "commander";
import chalk from "chalk";
import { input, confirm } from "@inquirer/prompts";
import { ExitPromptError } from "@inquirer/core";
import {
  addHost,
  parseLabels,
  HostError,
  HostErrorCode,
  type AddHostInput,
  type CheckHostResult,
} from "@/core/host";

interface AddOptions {
  ssh?: string;
  root?: string;
  default?: boolean;
  port?: string;
  identity?: string;
  connectTimeout?: string;
  check?: boolean;
  labels?: string;
  json?: boolean;
}

function formatCheckResult(result: CheckHostResult): string {
  const lines: string[] = [];

  if (result.checks.ssh.ok) {
    lines.push(`  ${chalk.green("✓")} SSH connection`);
  } else {
    lines.push(`  ${chalk.red("✗")} SSH connection: ${result.checks.ssh.error}`);
    return lines.join("\n");
  }

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

  return lines.join("\n");
}

async function runInteractiveAdd(): Promise<AddHostInput & { runCheck: boolean }> {
  console.log(chalk.cyan("\n  Add a new host\n"));

  const name = await input({
    message: "Host name:",
    validate: (value) => {
      if (!value) return "Host name is required";
      if (!/^[a-z][a-z0-9_-]{0,31}$/.test(value)) {
        return "Must start with a-z, followed by a-z, 0-9, _, or - (max 32 chars)";
      }
      return true;
    },
  });

  const ssh = await input({
    message: "SSH target (alias or user@host):",
    validate: (value) => (value ? true : "SSH target is required"),
  });

  const root = await input({
    message: "Remote base directory:",
    default: "/srv/wt",
    validate: (value) => {
      if (!value) return "Root path is required";
      if (!value.startsWith("/")) return "Must be an absolute path (start with /)";
      return true;
    },
  });

  const setDefault = await confirm({
    message: "Set as default host?",
    default: true,
  });

  const runCheck = await confirm({
    message: "Run connectivity check?",
    default: true,
  });

  return {
    name,
    ssh,
    root,
    setDefault,
    skipCheck: !runCheck,
    runCheck,
  };
}

export function registerHostAddCommand(parent: Command) {
  parent
    .command("add")
    .description("Register or update a remote host")
    .argument("[name]", "Host identifier (a-z, 0-9, _, - ; max 32 chars)")
    .option("-s, --ssh <target>", "SSH target (alias, user@host, or ssh://user@host:port)")
    .option("-r, --root <path>", "Remote base directory (absolute path)")
    .option("-d, --default", "Set as default host")
    .option("-p, --port <number>", "SSH port (overrides target/config)")
    .option("-i, --identity <path>", "Path to SSH identity file")
    .option("-t, --connect-timeout <seconds>", "Connection timeout in seconds", "10")
    .option("--no-check", "Skip connectivity check after adding")
    .option("-l, --labels <k=v,...>", "Comma-separated key=value labels")
    .option("--json", "Output result as JSON")
    .action(async (name: string | undefined, options: AddOptions) => {
      try {
        let hostInput: AddHostInput;

        const needsInteractive = !name || !options.ssh || !options.root;

        if (needsInteractive && options.json) {
          const error = { ok: false, error: "Missing required arguments (name, --ssh, --root) and --json prevents interactive mode" };
          console.log(JSON.stringify(error, null, 2));
          process.exit(1);
        }

        if (needsInteractive) {
          const interactiveInput = await runInteractiveAdd();
          hostInput = interactiveInput;
        } else {
          hostInput = {
            name: name!,
            ssh: options.ssh!,
            root: options.root!,
            setDefault: options.default,
            port: options.port ? parseInt(options.port, 10) : undefined,
            identity: options.identity,
            connectTimeout: options.connectTimeout ? parseInt(options.connectTimeout, 10) : undefined,
            skipCheck: options.check === false,
            labels: parseLabels(options.labels),
          };
        }

        if (!hostInput.skipCheck && !options.json) {
          console.log(`\nChecking ${hostInput.name} (${hostInput.ssh}:${hostInput.root})...`);
        }

        const result = await addHost(hostInput);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.checkResult) {
            console.log(formatCheckResult(result.checkResult));
            console.log();
          }

          const defaultNote = hostInput.setDefault ? chalk.dim(" (default)") : "";
          const actionVerb = result.action === "created" ? "Added" : "Updated";

          if (result.checkResult?.ok === false) {
            console.log(chalk.yellow(`${actionVerb} host "${result.host.name}"${defaultNote}, but check failed.`));
          } else {
            console.log(chalk.green(`${actionVerb} host "${result.host.name}"${defaultNote}`));
          }
        }

        if (result.checkResult && !result.checkResult.ok) {
          process.exit(2);
        }
      } catch (error) {
        if (error instanceof ExitPromptError) {
          console.log(chalk.dim("\nCancelled."));
          process.exit(130); // Standard exit code for SIGINT
        }

        if (error instanceof HostError) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
          } else {
            console.error(chalk.red(`Error: ${error.message}`));
          }
          process.exit(error.code === HostErrorCode.VALIDATION_ERROR ? 1 : 1);
        }
        throw error;
      }
    });
}
