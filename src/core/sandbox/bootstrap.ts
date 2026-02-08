import { LOCAL_HOST_NAME, getHost } from "@/core/host/config";
import type { CheckItem } from "@/core/backend/types";
import { getBackend, resolveRoot } from "@/core/backend";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { runSshCommand, hostToSshOptions } from "@/core/ssh";
import { q } from "@/core/ssh/quote";

/** Pattern for valid binary/agent names passed to `command -v` on remote hosts. */
const SAFE_BIN_NAME = /^[a-zA-Z0-9._-]+$/;

export interface BootstrapOptions {
  hostName: string;
  tmux: boolean;
  agents: string[];
}

export interface BootstrapResult {
  host: string;
  ok: boolean;
  checks: CheckItem[];
  missing: string[];
  instructions: string[];
}

async function detectRemotePackageManager(hostName: string): Promise<string | null> {
  const host = await getHost(hostName);
  if (!host) return null;
  const sshOpts = hostToSshOptions(host);

  for (const pm of ["apt-get", "apk", "dnf", "yum", "brew"]) {
    const result = await runSshCommand(sshOpts, `command -v ${q(pm)}`);
    if (result.ok) return pm;
  }
  return null;
}

function installHint(pkg: string, pm: string): string {
  switch (pm) {
    case "apt-get": return `sudo apt-get install -y ${pkg}`;
    case "apk": return `sudo apk add ${pkg}`;
    case "dnf": return `sudo dnf install -y ${pkg}`;
    case "yum": return `sudo yum install -y ${pkg}`;
    case "brew": return `brew install ${pkg}`;
    default: return `install ${pkg} manually`;
  }
}

export async function bootstrapHost(opts: BootstrapOptions): Promise<BootstrapResult> {
  const checks: CheckItem[] = [];
  const missing: string[] = [];
  const instructions: string[] = [];
  const isLocal = opts.hostName === LOCAL_HOST_NAME;

  const backend = await getBackend(opts.hostName);

  const gitCheck = await backend.checkGit();
  checks.push(gitCheck);
  if (!gitCheck.ok) missing.push("git");

  const runtimeCheck = await backend.checkRuntime();
  checks.push(runtimeCheck);
  if (!runtimeCheck.ok) missing.push("bun or node");

  if (opts.tmux) {
    const tmuxCheck = await backend.checkTmux();
    checks.push(tmuxCheck);
    if (!tmuxCheck.ok) missing.push("tmux");
  }

  if (!isLocal) {
    const host = await getHost(opts.hostName);
    if (!host) {
      throw new SandboxError(
        SandboxErrorCode.HOST_NOT_FOUND,
        `Host "${opts.hostName}" not found`,
      );
    }
    const sshOpts = hostToSshOptions(host);

    for (const bin of ["bash", "curl"]) {
      const result = await runSshCommand(sshOpts, `command -v ${q(bin)}`);
      const item: CheckItem = result.ok
        ? { name: bin, ok: true }
        : { name: bin, ok: false, detail: "not found" };
      checks.push(item);
      if (!item.ok) missing.push(bin);
    }

    for (const agent of opts.agents) {
      if (!SAFE_BIN_NAME.test(agent)) {
        throw new SandboxError(
          SandboxErrorCode.VALIDATION_ERROR,
          `Invalid agent name "${agent}": must contain only alphanumeric characters, dots, underscores, or hyphens`,
        );
      }
      const result = await runSshCommand(sshOpts, `command -v ${q(agent)}`);
      const item: CheckItem = result.ok
        ? { name: agent, ok: true }
        : { name: agent, ok: false, detail: "not found" };
      checks.push(item);
      if (!item.ok) missing.push(agent);
    }

    if (missing.length > 0) {
      const pm = await detectRemotePackageManager(opts.hostName);
      if (pm) {
        for (const pkg of missing) {
          if (pkg === "bun or node") {
            instructions.push("curl -fsSL https://bun.sh/install | bash");
          } else if (pkg === "claude" || pkg === "opencode") {
            instructions.push(`npm install -g ${pkg}`);
          } else {
            instructions.push(installHint(pkg, pm));
          }
        }
      } else {
        instructions.push(`No package manager found. Install manually: ${missing.join(", ")}`);
      }
    }
  } else {
    if (missing.length > 0) {
      for (const pkg of missing) {
        if (pkg === "bun or node") {
          instructions.push("curl -fsSL https://bun.sh/install | bash");
        } else {
          instructions.push(`Install ${pkg} using your system package manager`);
        }
      }
    }
  }

  try {
    const root = await resolveRoot(opts.hostName);
    await backend.ensureLayout(root);
    checks.push({ name: "layout", ok: true });
  } catch (err) {
    checks.push({ name: "layout", ok: false, detail: err instanceof Error ? err.message : String(err) });
  }

  const ok = missing.length === 0 && checks.every((c) => c.ok);

  return { host: opts.hostName, ok, checks, missing, instructions };
}
