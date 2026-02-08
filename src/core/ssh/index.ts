import type { HostConfig } from "@/core/host/types";

export interface SshOptions {
  ssh: string;
  port?: number;
  identity?: string;
  connectTimeout?: number;
}

export function buildSshArgs(options: SshOptions): string[] {
  const args: string[] = [];

  if (options.connectTimeout) {
    args.push("-o", `ConnectTimeout=${options.connectTimeout}`);
  }

  args.push("-o", "BatchMode=yes");

  args.push("-o", "StrictHostKeyChecking=accept-new");

  if (options.port) {
    args.push("-p", String(options.port));
  }

  if (options.identity) {
    args.push("-i", options.identity);
  }

  args.push(options.ssh);

  return args;
}

export function hostToSshOptions(host: HostConfig): SshOptions {
  return {
    ssh: host.ssh,
    port: host.port,
    identity: host.identity,
    connectTimeout: host.connectTimeout,
  };
}

export interface SshResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runSshCommand(
  options: SshOptions,
  command: string,
): Promise<SshResult> {
  const args = buildSshArgs(options);
  args.push(command);

  try {
    const result = await Bun.$`ssh ${args}`.quiet().nothrow();
    return {
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout.toString().trim(),
      stderr: result.stderr.toString().trim(),
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: -1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testSshConnection(
  options: SshOptions,
): Promise<SshResult> {
  return runSshCommand(options, "echo ok");
}

export async function getRemoteGitVersion(
  options: SshOptions,
): Promise<SshResult> {
  return runSshCommand(options, "git --version");
}

export async function getRemoteNodeVersion(
  options: SshOptions,
): Promise<SshResult> {
  return runSshCommand(options, "node --version");
}

export async function ensureRemoteDirectories(
  options: SshOptions,
  root: string,
): Promise<SshResult> {
  const dirs = ["mirrors", "sandboxes", "meta"].map((d) => `${root}/${d}`);
  const command = `mkdir -p ${dirs.join(" ")}`;
  return runSshCommand(options, command);
}

export async function checkRemoteDirectories(
  options: SshOptions,
  root: string,
): Promise<SshResult> {
  const dirs = ["mirrors", "sandboxes", "meta"];
  const commands = [
    `mkdir -p ${dirs.map((d) => `${root}/${d}`).join(" ")}`,
    ...dirs.map((d) => `test -w ${root}/${d}`),
  ];

  const command = commands.join(" && ");
  return runSshCommand(options, command);
}
