import type {
  AddHostInput,
  AddHostResult,
  HostConfig,
} from "@/core/host/types";
import { loadConfig, saveConfig } from "@/core/host/config";
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

  const config = await loadConfig();
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

  await saveConfig(config);

  let checkResult;
  if (!input.skipCheck) {
    checkResult = await checkHostConfig(host);

    host.lastCheckedAt = new Date().toISOString();
    host.lastStatus = checkResult.ok ? "ok" : "error";
    host.updatedAt = new Date().toISOString();
    config.hosts[input.name] = host;
    await saveConfig(config);
  }

  return {
    ok: true,
    action,
    host,
    checkResult,
  };
}
