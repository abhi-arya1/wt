import type { Command } from "commander";
import chalk from "chalk";
import { LOCAL_HOST_NAME } from "@/core/host/config";
import { SandboxError } from "@/core/sandbox/types";
import { isInsideGitRepo, getCurrentBranch, sanitizeBranchName } from "@/core/sandbox/git";
import { createSandbox } from "@/core/sandbox/create";
import { buildEnterCommand } from "@/core/sandbox/enter";

interface LocalOptions {
  branch?: string;
  ref?: string;
  json?: boolean;
}

export function registerLocalCommand(program: Command) {
  program
    .command("local")
    .description("Create a local sandbox worktree")
    .argument("[name]", "Sandbox name (defaults to branch name from --ref or current branch)")
    .option("-b, --branch <ref>", "Git branch, tag, or sha (defaults to HEAD)")
    .option("-r, --ref <ref>", "Alias for --branch")
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

        const ref = options.branch ?? options.ref;

        let name = nameArg;
        if (!name) {
          const branch = ref ?? (await getCurrentBranch());
          if (branch) {
            name = sanitizeBranchName(branch);
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
        });

        if (options.json) {
          console.log(JSON.stringify(result.entry, null, 2));
          return;
        }

        if (result.isIdempotent) {
          console.log(chalk.dim(`Sandbox "${name}" already exists`));
        }

        const cmd = buildEnterCommand(result.entry);
        console.log(cmd);
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
