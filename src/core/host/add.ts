import type {
  AddHostInput,
  AddHostResult,
  HostConfig,
} from "@/core/host/types";
import { withConfig } from "@/core/host/config";
import { validateHostInput } from "@/core/host/validate";
import { checkHostConfig } from "@/core/host/check";

const DEFAULT_CONNECT_TIMEOUT = 10;

export async function addHost(input: AddHostInput): Promise<AddHostResult> {
  validateHostInput({
    name: input.name,
    ssh: input.ssh,
    root: input.root,
    port: input.port,
    connectTimeout: input.connectTimeout,
  });

  // First atomic write: persist the host so it exists in config even if
  // the subsequent SSH check fails or the process is interrupted.
  const { host, action } = await withConfig((config) => {
    const existingHost = config.hosts[input.name];
    const now = new Date().toISOString();

    const host: HostConfig = {
      name: input.name,
      ssh: input.ssh,
      root: input.root,
      port: input.port,
      identity: input.identity,
      connectTimeout: input.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT,
      labels: input.labels ?? {},
      createdAt: existingHost?.createdAt ?? now,
      updatedAt: now,
      lastCheckedAt: existingHost?.lastCheckedAt ?? null,
      lastStatus: existingHost?.lastStatus ?? "unchecked",
    };

    const action = existingHost ? "updated" : "created";

    config.hosts[input.name] = host;

    if (input.setDefault) {
      config.defaultHost = input.name;
    }

    return { host, action } as const;
  });

  // Run SSH check outside the lock (can take seconds over the network).
  let checkResult;
  if (!input.skipCheck) {
    checkResult = await checkHostConfig(host);

    // Second atomic write: update the host with check results.
    await withConfig((config) => {
      const h = config.hosts[input.name];
      if (h) {
        h.lastCheckedAt = new Date().toISOString();
        h.lastStatus = checkResult!.ok ? "ok" : "error";
        h.updatedAt = new Date().toISOString();
      }
    });

    // Reflect the updated fields on the returned object.
    host.lastCheckedAt = new Date().toISOString();
    host.lastStatus = checkResult.ok ? "ok" : "error";
  }

  return {
    ok: true,
    action,
    host,
    checkResult,
  };
}
