import type { HostConfig, SandboxEntry } from "@/core/host/types";
import type { Backend, ExecResult, TmuxSession, CheckItem } from "@/core/backend/types";
import { runSshCommand, buildSshArgs, hostToSshOptions } from "@/core/ssh";
import { q } from "@/core/ssh/quote";

function stripBatchMode(args: string[]): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" && args[i + 1]?.startsWith("BatchMode")) {
      i++;
      continue;
    }
    filtered.push(args[i]);
  }
  return filtered;
}

export class SshBackend implements Backend {
  private host: HostConfig;

  constructor(host: HostConfig) {
    this.host = host;
  }

  private get sshOpts() {
    return hostToSshOptions(this.host);
  }

  async ensureLayout(root: string): Promise<void> {
    const dirs = ["mirrors", "sandboxes", "meta"]
      .map((d) => q(`${root}/${d}`))
      .join(" ");
    const result = await runSshCommand(this.sshOpts, `mkdir -p ${dirs}`);
    if (!result.ok) {
      throw new Error(`Failed to create remote layout: ${result.stderr}`);
    }
  }

  async ensureMirror(root: string, repoId: string, origin: string): Promise<string> {
    const mirrorPath = `${root}/mirrors/${repoId}.git`;
    const check = await runSshCommand(this.sshOpts, `test -f ${q(mirrorPath)}/HEAD`);
    if (!check.ok) {
      const clone = await runSshCommand(
        this.sshOpts,
        `git clone --bare --mirror ${q(origin)} ${q(mirrorPath)}`,
      );
      if (!clone.ok) {
        throw new Error(`Failed to create remote mirror: ${clone.stderr}`);
      }
    } else {
      await runSshCommand(this.sshOpts, `git -C ${q(mirrorPath)} fetch --prune origin`);
    }
    return mirrorPath;
  }

  async createWorktree(mirrorPath: string, sandboxPath: string, ref: string, branch?: string): Promise<void> {
    const cmd = branch
      ? `git -C ${q(mirrorPath)} worktree add -B ${q(branch)} ${q(sandboxPath)}`
      : `git -C ${q(mirrorPath)} worktree add --detach ${q(sandboxPath)} ${q(ref)}`;
    const result = await runSshCommand(this.sshOpts, cmd);
    if (!result.ok) {
      throw new Error(`Failed to create remote worktree: ${result.stderr}`);
    }
    // Mirror clones set remote.origin.mirror=true which forces `git push` to push
    // all refs (including hidden refs/pull/*). Disable mirror mode and restrict push
    // to only heads so users don't see "remote rejected" errors on hidden refs.
    await runSshCommand(this.sshOpts, `git -C ${q(sandboxPath)} config --unset remote.origin.mirror`);
    await runSshCommand(this.sshOpts, `git -C ${q(sandboxPath)} config remote.origin.push refs/heads/*:refs/heads/*`);
  }

  async writeMeta(root: string, id: string, meta: SandboxEntry): Promise<void> {
    const metaPath = `${root}/meta/${id}.json`;
    const json = JSON.stringify(meta, null, 2);
    const escaped = json.replace(/'/g, "'\\''");
    const result = await runSshCommand(
      this.sshOpts,
      `printf '%s' '${escaped}' > ${q(metaPath)}`,
    );
    if (!result.ok) {
      throw new Error(`Failed to write remote meta: ${result.stderr}`);
    }
  }

  async removeSandboxDir(sandboxPath: string): Promise<void> {
    await runSshCommand(this.sshOpts, `rm -rf ${q(sandboxPath)}`);
  }

  async pruneWorktrees(mirrorPath: string): Promise<void> {
    await runSshCommand(this.sshOpts, `git -C ${q(mirrorPath)} worktree prune`);
  }

  async removeMeta(root: string, id: string): Promise<void> {
    await runSshCommand(this.sshOpts, `rm -f ${q(`${root}/meta/${id}.json`)}`);
  }

  async dirExists(path: string): Promise<boolean> {
    const result = await runSshCommand(this.sshOpts, `test -d ${q(path)}`);
    return result.ok;
  }

  async exec(cwd: string, command: string[]): Promise<ExecResult> {
    const cmdStr = command
      .map((c) => `'${c.replace(/'/g, "'\\''")}'`)
      .join(" ");
    const result = await runSshCommand(this.sshOpts, `cd ${q(cwd)} && ${cmdStr}`);
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  async execStream(cwd: string, command: string[]): Promise<number> {
    const cmdStr = command
      .map((c) => `'${c.replace(/'/g, "'\\''")}'`)
      .join(" ");
    const args = stripBatchMode(buildSshArgs(this.sshOpts));
    const remoteCmd = `cd ${q(cwd)} && ${cmdStr}`;
    const proc = Bun.spawn(["ssh", "-t", ...args, remoteCmd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    return proc.exited;
  }

  async execInteractive(cwd: string, _env?: Record<string, string>): Promise<never> {
    const args = stripBatchMode(buildSshArgs(this.sshOpts));
    const remoteCmd = `cd ${q(cwd)} && exec $SHELL -l`;
    const proc = Bun.spawn(["ssh", "-t", ...args, remoteCmd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: process.env,
    });
    const code = await proc.exited;
    process.exit(code);
  }

  async execTmux(cwd: string, sessionName: string): Promise<never> {
    const args = stripBatchMode(buildSshArgs(this.sshOpts));
    const remoteCmd = `cd ${q(cwd)} && tmux new-session -A -s ${q(sessionName)}`;
    const proc = Bun.spawn(["ssh", "-t", ...args, remoteCmd], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: process.env,
    });
    const code = await proc.exited;
    process.exit(code);
  }

  async listTmuxSessions(): Promise<TmuxSession[]> {
    const result = await runSshCommand(
      this.sshOpts,
      "tmux ls -F '#{session_name}\t#{session_attached}'",
    );
    if (!result.ok) return [];
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    return lines
      .map((line) => {
        const [name, attached] = line.split("\t");
        return { name, attached: attached === "1" };
      })
      .filter((s) => s.name.startsWith("wt-"));
  }

  async copyEnvFiles(srcDir: string, destDir: string): Promise<void> {
    const glob = new Bun.Glob(".env*");
    const files: string[] = [];
    for await (const file of glob.scan({ cwd: srcDir, onlyFiles: true, dot: true })) {
      files.push(file);
    }
    if (files.length === 0) return;

    const sshArgs = buildSshArgs(this.sshOpts);
    const target = sshArgs.pop()!;
    const scpOpts: string[] = [];
    for (let i = 0; i < sshArgs.length; i++) {
      if (sshArgs[i] === "-p") {
        scpOpts.push("-P", sshArgs[i + 1]);
        i++;
      } else if (sshArgs[i] === "-i") {
        scpOpts.push("-i", sshArgs[i + 1]);
        i++;
      } else if (sshArgs[i] === "-o") {
        scpOpts.push("-o", sshArgs[i + 1]);
        i++;
      }
    }

    for (const file of files) {
      const localPath = `${srcDir}/${file}`;
      const remotePath = `${target}:${destDir}/${file}`;
      await Bun.$`scp ${scpOpts} ${localPath} ${remotePath}`.quiet().nothrow();
    }
  }

  async checkGit(): Promise<CheckItem> {
    const result = await runSshCommand(this.sshOpts, "git --version");
    if (!result.ok) {
      return { name: "git", ok: false, detail: "not found" };
    }
    return { name: "git", ok: true, detail: result.stdout.trim() };
  }

  async checkTmux(): Promise<CheckItem> {
    const result = await runSshCommand(this.sshOpts, "tmux -V");
    if (!result.ok) {
      return { name: "tmux", ok: false, detail: "not found" };
    }
    return { name: "tmux", ok: true, detail: result.stdout.trim() };
  }

  async checkRuntime(): Promise<CheckItem> {
    const bunResult = await runSshCommand(this.sshOpts, "bun --version");
    if (bunResult.ok) {
      return { name: "bun", ok: true, detail: bunResult.stdout.trim() };
    }
    const nodeResult = await runSshCommand(this.sshOpts, "node --version");
    if (nodeResult.ok) {
      return { name: "node", ok: true, detail: nodeResult.stdout.trim() };
    }
    return { name: "runtime", ok: false, detail: "neither bun nor node found" };
  }
}
