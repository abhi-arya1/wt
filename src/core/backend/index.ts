import { LOCAL_HOST_NAME, getHost } from "@/core/host/config";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { getRepoRoot } from "@/core/sandbox/git";
import type { Backend } from "@/core/backend/types";
import { LocalBackend } from "@/core/backend/local";
import { SshBackend } from "@/core/backend/ssh";

export type { Backend, ExecResult, TmuxSession, CheckItem } from "@/core/backend/types";
export { LocalBackend } from "@/core/backend/local";
export { SshBackend } from "@/core/backend/ssh";

export async function getBackend(hostName: string): Promise<Backend> {
  if (hostName === LOCAL_HOST_NAME) {
    return new LocalBackend();
  }
  const host = await getHost(hostName);
  if (!host) {
    throw new SandboxError(
      SandboxErrorCode.HOST_NOT_FOUND,
      `Host "${hostName}" not found`,
    );
  }
  return new SshBackend(host);
}

export async function resolveRoot(hostName: string): Promise<string> {
  if (hostName === LOCAL_HOST_NAME) {
    const repoRoot = await getRepoRoot();
    return `${repoRoot}/.wt`;
  }
  const host = await getHost(hostName);
  if (!host) {
    throw new SandboxError(
      SandboxErrorCode.HOST_NOT_FOUND,
      `Host "${hostName}" not found`,
    );
  }
  return host.root;
}
