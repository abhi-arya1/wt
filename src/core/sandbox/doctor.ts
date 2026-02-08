import { LOCAL_HOST_NAME } from "@/core/host/config";
import type { CheckItem } from "@/core/backend/types";
import { getBackend } from "@/core/backend";
import { testSshConnection, hostToSshOptions } from "@/core/ssh";
import { getHost } from "@/core/host/config";

export interface DoctorResult {
  ok: boolean;
  host: string;
  checks: CheckItem[];
  warnings: string[];
  errors: string[];
}

export async function runDoctor(hostName: string): Promise<DoctorResult> {
  const checks: CheckItem[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (hostName !== LOCAL_HOST_NAME) {
    const host = await getHost(hostName);
    if (!host) {
      return {
        ok: false,
        host: hostName,
        checks: [{ name: "host", ok: false, detail: "not found in config" }],
        warnings: [],
        errors: [`Host "${hostName}" not found`],
      };
    }

    const sshResult = await testSshConnection(hostToSshOptions(host));
    const sshCheck: CheckItem = sshResult.ok
      ? { name: "ssh", ok: true, detail: "connected" }
      : { name: "ssh", ok: false, detail: sshResult.stderr || "connection failed" };
    checks.push(sshCheck);

    if (!sshCheck.ok) {
      errors.push(`SSH connection failed: ${sshCheck.detail}`);
      return { ok: false, host: hostName, checks, warnings, errors };
    }
  }

  const backend = await getBackend(hostName);

  const gitCheck = await backend.checkGit();
  checks.push(gitCheck);
  if (!gitCheck.ok) errors.push(`git: ${gitCheck.detail}`);

  const runtimeCheck = await backend.checkRuntime();
  checks.push(runtimeCheck);
  if (!runtimeCheck.ok) warnings.push(`runtime: ${runtimeCheck.detail}`);

  const tmuxCheck = await backend.checkTmux();
  checks.push(tmuxCheck);
  if (!tmuxCheck.ok) warnings.push(`tmux: ${tmuxCheck.detail}`);

  const ok = checks.every((c) => c.ok || c.name === "tmux" || c.name === "runtime");

  return { ok, host: hostName, checks, warnings, errors };
}
