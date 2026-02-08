import { LOCAL_HOST_NAME, getHost } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { requireSandbox } from "@/core/sandbox/state";
import { getBackend } from "@/core/backend";

export async function enterSandbox(name: string): Promise<never> {
  const entry = await requireSandbox(name);
  const backend = await getBackend(entry.host);

  const exists = await backend.dirExists(entry.path);
  if (!exists) {
    throw new SandboxError(
      SandboxErrorCode.PATH_MISSING,
      `Sandbox path does not exist: ${entry.path}`,
    );
  }

  return backend.execInteractive(entry.path, {
    WT_SANDBOX: entry.name,
    WT_SANDBOX_ID: entry.id,
  });
}

export async function enterSandboxTmux(name: string): Promise<never> {
  const entry = await requireSandbox(name);
  const backend = await getBackend(entry.host);

  const exists = await backend.dirExists(entry.path);
  if (!exists) {
    throw new SandboxError(
      SandboxErrorCode.PATH_MISSING,
      `Sandbox path does not exist: ${entry.path}`,
    );
  }

  const tmuxCheck = await backend.checkTmux();
  if (!tmuxCheck.ok) {
    throw new SandboxError(
      SandboxErrorCode.CREATION_FAILED,
      "tmux not found on host. Run: wt bootstrap --tmux --host <host>",
    );
  }

  const sessionName = `wt-${entry.id}`;
  return backend.execTmux(entry.path, sessionName);
}

export function buildEnterCommand(entry: SandboxEntry, host?: { ssh: string; port?: number; identity?: string }): string {
  if (entry.host === LOCAL_HOST_NAME) {
    return `wt enter ${entry.name}`;
  }

  if (!host) {
    return `wt enter ${entry.name}`;
  }

  const parts = ["ssh", "-t"];
  if (host.port) {
    parts.push("-p", String(host.port));
  }
  if (host.identity) {
    parts.push("-i", host.identity);
  }
  parts.push(host.ssh, `'cd ${entry.path} && exec $SHELL -l'`);
  return parts.join(" ");
}
