import { loadConfig, saveConfig } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { getBackend, resolveRoot } from "@/core/backend";

export async function getSandbox(
  name: string,
): Promise<SandboxEntry | undefined> {
  const config = await loadConfig();
  return config.sandboxes[name];
}

export async function putSandbox(entry: SandboxEntry): Promise<void> {
  const config = await loadConfig();
  config.sandboxes[entry.name] = entry;
  await saveConfig(config);
}

export async function removeSandbox(name: string): Promise<boolean> {
  const config = await loadConfig();
  if (!config.sandboxes[name]) {
    return false;
  }
  delete config.sandboxes[name];
  await saveConfig(config);
  return true;
}

export async function listSandboxes(): Promise<SandboxEntry[]> {
  const config = await loadConfig();
  return Object.values(config.sandboxes).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function requireSandbox(name: string): Promise<SandboxEntry> {
  const entry = await getSandbox(name);
  if (!entry) {
    throw new SandboxError(
      SandboxErrorCode.SANDBOX_NOT_FOUND,
      `Sandbox "${name}" not found`,
    );
  }
  return entry;
}

export async function renameSandbox(
  oldName: string,
  newName: string,
): Promise<SandboxEntry> {
  const config = await loadConfig();
  const entry = config.sandboxes[oldName];
  if (!entry) {
    throw new SandboxError(
      SandboxErrorCode.SANDBOX_NOT_FOUND,
      `Sandbox "${oldName}" not found`,
    );
  }
  if (config.sandboxes[newName]) {
    throw new SandboxError(
      SandboxErrorCode.SANDBOX_EXISTS,
      `Sandbox "${newName}" already exists`,
    );
  }

  const updated: SandboxEntry = { ...entry, name: newName };
  delete config.sandboxes[oldName];
  config.sandboxes[newName] = updated;
  await saveConfig(config);

  try {
    const backend = await getBackend(entry.host);
    const root = await resolveRoot(entry.host);
    await backend.writeMeta(root, entry.id, updated);
  } catch {}

  return updated;
}
