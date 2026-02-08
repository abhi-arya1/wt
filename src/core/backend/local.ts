import type { SandboxEntry } from "@/core/host/types";
import type { Backend, ExecResult, TmuxSession, CheckItem } from "@/core/backend/types";
import { getRepoRoot } from "@/core/sandbox/git";

export class LocalBackend implements Backend {
  async ensureLayout(root: string): Promise<void> {
    await Bun.$`mkdir -p ${root}/mirrors ${root}/sandboxes ${root}/meta`.quiet();
  }

  async ensureMirror(root: string, repoId: string, origin: string): Promise<string> {
    const mirrorPath = `${root}/mirrors/${repoId}.git`;
    const exists = await Bun.file(`${mirrorPath}/HEAD`).exists();
    if (!exists) {
      const result = await Bun.$`git clone --bare --mirror ${origin} ${mirrorPath}`
        .quiet()
        .nothrow();
      if (result.exitCode !== 0) {
        throw new Error(`Failed to create mirror: ${result.stderr.toString().trim()}`);
      }
    } else {
      await Bun.$`git -C ${mirrorPath} fetch --prune origin`.quiet().nothrow();
    }
    const localRoot = await getRepoRoot();
    await Bun.$`git -C ${mirrorPath} fetch ${localRoot} '+refs/heads/*:refs/heads/*'`.quiet().nothrow();
    return mirrorPath;
  }

  async createWorktree(mirrorPath: string, sandboxPath: string, ref: string, branch?: string): Promise<void> {
    const result = branch
      ? await Bun.$`git -C ${mirrorPath} worktree add -B ${branch} ${sandboxPath}`.quiet().nothrow()
      : await Bun.$`git -C ${mirrorPath} worktree add --detach ${sandboxPath} ${ref}`.quiet().nothrow();
    if (result.exitCode !== 0) {
      throw new Error(`Failed to create worktree: ${result.stderr.toString().trim()}`);
    }
  }

  async writeMeta(root: string, id: string, meta: SandboxEntry): Promise<void> {
    const metaPath = `${root}/meta/${id}.json`;
    await Bun.write(metaPath, JSON.stringify(meta, null, 2));
  }

  async removeSandboxDir(sandboxPath: string): Promise<void> {
    await Bun.$`rm -rf ${sandboxPath}`.quiet().nothrow();
  }

  async pruneWorktrees(mirrorPath: string): Promise<void> {
    await Bun.$`git -C ${mirrorPath} worktree prune`.quiet().nothrow();
  }

  async removeMeta(root: string, id: string): Promise<void> {
    const metaPath = `${root}/meta/${id}.json`;
    await Bun.$`rm -f ${metaPath}`.quiet().nothrow();
  }

  async dirExists(path: string): Promise<boolean> {
    return Bun.file(`${path}/.git`).exists();
  }

  async exec(cwd: string, command: string[]): Promise<ExecResult> {
    const [cmd, ...args] = command;
    const result = await Bun.$`${cmd} ${args}`.cwd(cwd).quiet().nothrow();
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString().trim(),
      stderr: result.stderr.toString().trim(),
    };
  }

  async execStream(cwd: string, command: string[]): Promise<number> {
    const proc = Bun.spawn(command, {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    return proc.exited;
  }

  async execInteractive(cwd: string, env?: Record<string, string>): Promise<never> {
    const shell = Bun.env.SHELL || "/bin/sh";
    const proc = Bun.spawn([shell, "-l"], {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, ...env },
    });
    const code = await proc.exited;
    process.exit(code);
  }

  async execTmux(cwd: string, sessionName: string): Promise<never> {
    const proc = Bun.spawn(["tmux", "new-session", "-A", "-s", sessionName, "-c", cwd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    process.exit(code);
  }

  async listTmuxSessions(): Promise<TmuxSession[]> {
    const result = await Bun.$`tmux ls -F '#{session_name}\t#{session_attached}'`
      .quiet()
      .nothrow();
    if (result.exitCode !== 0) return [];
    const lines = result.stdout.toString().trim().split("\n").filter(Boolean);
    return lines
      .map((line) => {
        const [name, attached] = line.split("\t");
        return { name, attached: attached === "1" };
      })
      .filter((s) => s.name.startsWith("wt-"));
  }

  async copyEnvFiles(srcDir: string, destDir: string): Promise<void> {
    const glob = new Bun.Glob(".env*");
    for await (const file of glob.scan({ cwd: srcDir, onlyFiles: true, dot: true })) {
      const src = Bun.file(`${srcDir}/${file}`);
      await Bun.write(`${destDir}/${file}`, src);
    }
  }

  async checkGit(): Promise<CheckItem> {
    const result = await Bun.$`git --version`.quiet().nothrow();
    if (result.exitCode !== 0) {
      return { name: "git", ok: false, detail: "not found" };
    }
    return { name: "git", ok: true, detail: result.stdout.toString().trim() };
  }

  async checkTmux(): Promise<CheckItem> {
    const result = await Bun.$`tmux -V`.quiet().nothrow();
    if (result.exitCode !== 0) {
      return { name: "tmux", ok: false, detail: "not found" };
    }
    return { name: "tmux", ok: true, detail: result.stdout.toString().trim() };
  }

  async checkRuntime(): Promise<CheckItem> {
    const bunResult = await Bun.$`bun --version`.quiet().nothrow();
    if (bunResult.exitCode === 0) {
      return { name: "bun", ok: true, detail: bunResult.stdout.toString().trim() };
    }
    const nodeResult = await Bun.$`node --version`.quiet().nothrow();
    if (nodeResult.exitCode === 0) {
      return { name: "node", ok: true, detail: nodeResult.stdout.toString().trim() };
    }
    return { name: "runtime", ok: false, detail: "neither bun nor node found" };
  }
}
