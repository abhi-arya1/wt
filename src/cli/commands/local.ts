import type { Command } from "commander";
import chalk from "chalk";
import { LOCAL_HOST_NAME } from "@/core/host/config";
import { SandboxError } from "@/core/sandbox/types";
import { isInsideGitRepo, getCurrentBranch, sanitizeBranchName } from "@/core/sandbox/git";
import { createSandbox } from "@/core/sandbox/create";
import { enterSandbox, enterSandboxTmux, buildEnterCommand } from "@/core/sandbox/enter";

interface LocalOptions {
  branch?: string;
  ref?: string;
  enter?: boolean;
  tmux?: boolean;
  json?: boolean;
}

export function registerLocalCommand(program: Command) {
  program
    .command("local")
    .description("Create a local sandbox worktree")
    .argument("[name]", "Sandbox name (defaults to branch name from -b/--ref or current branch)")
    .option("-b, --branch <name>", "Create or use a branch with this name")
    .option("-r, --ref <ref>", "Git ref to check out (branch, tag, or sha that must exist)")
    .option("-e, --enter", "Enter the sandbox after creating it")
    .option("--tmux", "Use tmux when entering (implies --enter)")
    .option("--json", "Output result as JSON")
    .action(async (nameArg: string | undefined, options: LocalOptions) => {
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

        const result = await createSandbox({
          name,
          hostName: LOCAL_HOST_NAME,
          ref,
          branch,
        });

        if (options.json) {
          console.log(JSON.stringify(result.entry, null, 2));
          return;
        }

        if (result.isIdempotent) {
          console.log(chalk.dim(`Sandbox "${name}" already exists`));
        } else {
          console.log(chalk.green(`Created sandbox "${name}"`));
        }

        if (options.enter || options.tmux) {
          if (options.tmux) {
            await enterSandboxTmux(name);
          } else {
            await enterSandbox(name);
          }
          return;
        }

        const cmd = buildEnterCommand(result.entry);

        if (process.stdout.isTTY) {
          console.log(`Enter with: ${chalk.cyan(cmd)}`);
        } else {
          console.log(cmd);
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
