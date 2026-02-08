import type { SandboxEntry } from "@/core/host/types";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface TmuxSession {
  name: string;
  attached: boolean;
}

export interface CheckItem {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface Backend {
  ensureLayout(root: string): Promise<void>;
  ensureMirror(root: string, repoId: string, origin: string): Promise<string>;
  createWorktree(mirrorPath: string, sandboxPath: string, ref: string, branch?: string): Promise<void>;
  writeMeta(root: string, id: string, meta: SandboxEntry): Promise<void>;
  removeSandboxDir(sandboxPath: string): Promise<void>;
  pruneWorktrees(mirrorPath: string): Promise<void>;
  removeMeta(root: string, id: string): Promise<void>;
  dirExists(path: string): Promise<boolean>;
  exec(cwd: string, command: string[]): Promise<ExecResult>;
  execStream(cwd: string, command: string[]): Promise<number>;
  execInteractive(cwd: string, env?: Record<string, string>): Promise<never>;
  execTmux(cwd: string, sessionName: string): Promise<never>;
  listTmuxSessions(): Promise<TmuxSession[]>;
  copyEnvFiles(srcDir: string, destDir: string): Promise<void>;
  checkGit(): Promise<CheckItem>;
  checkTmux(): Promise<CheckItem>;
  checkRuntime(): Promise<CheckItem>;
}
