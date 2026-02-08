import {
  HostConfig,
  CheckHostResult,
  HostError,
  HostErrorCode,
} from "@/core/host/types";
import { loadConfig, withConfig } from "@/core/host/config";
import {
  testSshConnection,
  checkRemoteDirectories,
  getRemoteGitVersion,
  getRemoteNodeVersion,
  hostToSshOptions,
} from "@/core/ssh";

function parseGitVersion(output: string): string | null {
  const match = output.match(/git version (\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

function parseNodeVersion(output: string): string | null {
  const match = output.match(/v?(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function isGitVersionSupported(version: string): boolean {
  const [major, minor] = version.split(".").map(Number);
  return major > 2 || (major === 2 && minor >= 5);
}

export async function checkHost(name: string): Promise<CheckHostResult> {
  const config = await loadConfig();
  const host = config.hosts[name];

  if (!host) {
    throw new HostError(
      HostErrorCode.HOST_NOT_FOUND,
      `Host "${name}" not found`,
    );
  }

  return checkHostConfig(host);
}

export async function checkHostConfig(
  host: HostConfig,
): Promise<CheckHostResult> {
  const sshOptions = hostToSshOptions(host);
  const errors: string[] = [];
  const warnings: string[] = [];

  const result: CheckHostResult = {
    ok: false,
    host: host.name,
    checks: {
      ssh: { ok: false },
      directories: { ok: false },
      git: { ok: false },
      node: { ok: false },
    },
    errors,
    warnings,
  };

  const sshResult = await testSshConnection(sshOptions);
  if (sshResult.ok) {
    result.checks.ssh = { ok: true };
  } else {
    result.checks.ssh = {
      ok: false,
      error: sshResult.stderr || "Connection failed",
    };
    errors.push(
      `SSH connection failed: ${sshResult.stderr || "unknown error"}`,
    );
    return result;
  }

  const dirResult = await checkRemoteDirectories(sshOptions, host.root);
  if (dirResult.ok) {
    result.checks.directories = { ok: true };
  } else {
    result.checks.directories = {
      ok: false,
      error: dirResult.stderr || "Failed to create directories",
    };
    errors.push(
      `Directory check failed: ${dirResult.stderr || "unknown error"}`,
    );
  }

  const gitResult = await getRemoteGitVersion(sshOptions);
  if (gitResult.ok) {
    const version = parseGitVersion(gitResult.stdout);
    if (version) {
      if (isGitVersionSupported(version)) {
        result.checks.git = { ok: true, version };
      } else {
        result.checks.git = {
          ok: false,
          version,
          error: `Git ${version} does not support worktrees (need 2.5+)`,
        };
        errors.push(`Git ${version} does not support worktrees (need 2.5+)`);
      }
    } else {
      result.checks.git = { ok: false, error: "Could not parse git version" };
      errors.push("Could not parse git version");
    }
  } else {
    result.checks.git = { ok: false, error: "git not found" };
    errors.push("git not found on remote");
  }

  const nodeResult = await getRemoteNodeVersion(sshOptions);
  if (nodeResult.ok) {
    const version = parseNodeVersion(nodeResult.stdout);
    if (version) {
      result.checks.node = { ok: true, version };
    } else {
      result.checks.node = { ok: true, warning: true };
      warnings.push("Could not parse node version");
    }
  } else {
    result.checks.node = { ok: false, warning: true, error: "not found" };
    warnings.push("node not found (optional)");
  }

  result.ok =
    result.checks.ssh.ok &&
    result.checks.directories.ok &&
    result.checks.git.ok;

  return result;
}

export async function updateHostCheckStatus(
  name: string,
  result: CheckHostResult,
): Promise<void> {
  await withConfig((config) => {
    const host = config.hosts[name];

    if (!host) {
      throw new HostError(
        HostErrorCode.HOST_NOT_FOUND,
        `Host "${name}" not found`,
      );
    }

    host.lastCheckedAt = new Date().toISOString();
    host.lastStatus = result.ok ? "ok" : "error";
    host.updatedAt = new Date().toISOString();
  });
}

export async function checkAndUpdateHost(
  name: string,
): Promise<CheckHostResult> {
  const result = await checkHost(name);
  await updateHostCheckStatus(name, result);
  return result;
}
