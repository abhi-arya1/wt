import type { Command } from "commander";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
import { LOCAL_HOST_NAME, getHost, getDefaultHost } from "@/core/host/config";
import { SandboxError } from "@/core/sandbox/types";
import { isInsideGitRepo, getCurrentBranch, sanitizeBranchName } from "@/core/sandbox/git";
import { createSandbox } from "@/core/sandbox/create";
import { enterSandbox, enterSandboxTmux, buildEnterCommand } from "@/core/sandbox/enter";

interface UpOptions {
  host?: string;
  branch?: string;
  ref?: string;
  enter?: boolean;
  tmux?: boolean;
  json?: boolean;
}

export function registerUpCommand(program: Command) {
  program
    .command("up")
    .description("Create a sandbox worktree on a host")
    .argument("[name]", "Sandbox name (defaults to branch name from -b/--ref or current branch)")
    .option("-H, --host <hostName>", "Target host (defaults to configured default)")
    .option("-b, --branch <name>", "Create or use a branch with this name")
    .option("-r, --ref <ref>", "Git ref to check out (branch, tag, or sha that must exist)")
    .option("-e, --enter", "Enter the sandbox after creating it")
    .option("--tmux", "Use tmux when entering (implies --enter)")
    .option("--json", "Output result as JSON")
    .action(async (nameArg: string | undefined, options: UpOptions) => {
      let spinner: ReturnType<typeof createSpinner> | null = null;

      try {
        if (!(await isInsideGitRepo())) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: "Not inside a git repository" }, null, 2));
          } else {
            console.error(chalk.red("Error: Not inside a git repository"));
          }
          process.exit(1);
        }

        if (options.branch && options.ref) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: "Cannot use both --branch and --ref" }, null, 2));
          } else {
            console.error(chalk.red("Error: Cannot use both --branch and --ref"));
          }
          process.exit(1);
        }

        const ref = options.ref;
        const branch = options.branch;

        let name = nameArg;
        if (!name) {
          const branchOrRef = branch ?? ref ?? (await getCurrentBranch());
          if (branchOrRef) {
            name = sanitizeBranchName(branchOrRef);
          } else {
            if (options.json) {
              console.log(JSON.stringify({ ok: false, error: "No name provided and could not determine branch name" }, null, 2));
            } else {
              console.error(chalk.red("Error: No name provided and could not determine branch name"));
            }
            process.exit(1);
          }
        }

        let hostName: string;
        if (options.host) {
          hostName = options.host;
          if (hostName !== LOCAL_HOST_NAME) {
            const host = await getHost(hostName);
            if (!host) {
              if (options.json) {
                console.log(JSON.stringify({ ok: false, error: `Host "${hostName}" not found` }, null, 2));
              } else {
                console.error(chalk.red(`Error: Host "${hostName}" not found`));
              }
              process.exit(1);
            }
          }
        } else {
          const defaultHost = await getDefaultHost();
          hostName = defaultHost?.name ?? LOCAL_HOST_NAME;
        }

        if (!options.json) {
          spinner = createSpinner(`Creating sandbox "${name}"...`).start();
        }

        const result = await createSandbox({
          name,
          hostName,
          ref,
          branch,
        });

        if (options.json) {
          console.log(JSON.stringify(result.entry, null, 2));
          return;
        }

        if (result.isIdempotent) {
          spinner?.success({ text: chalk.dim(`Sandbox "${name}" already exists`) });
        } else {
          spinner?.success({ text: chalk.green(`Created sandbox "${name}"`) });
        }

        if (options.enter || options.tmux) {
          if (options.tmux) {
            await enterSandboxTmux(name);
          } else {
            await enterSandbox(name);
          }
          return;
        }

        const host = hostName !== LOCAL_HOST_NAME ? await getHost(hostName) : undefined;
        const cmd = buildEnterCommand(result.entry, host ?? undefined);

        if (process.stdout.isTTY) {
          console.log(`Enter with: ${chalk.cyan(cmd)}`);
        } else {
          console.log(cmd);
        }
      } catch (error) {
        if (error instanceof SandboxError) {
          if (options.json) {
            console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
          } else if (spinner) {
            spinner.error({ text: chalk.red(`Error: ${error.message}`) });
          } else {
            console.error(chalk.red(`Error: ${error.message}`));
          }
          process.exit(1);
        }
        throw error;
      }
    });
}
