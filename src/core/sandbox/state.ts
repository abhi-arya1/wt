import { loadConfig, withConfig } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { getBackend, resolveRoot } from "@/core/backend";
import { validateSandboxName } from "@/core/host/validate";

export async function getSandbox(
  name: string,
): Promise<SandboxEntry | undefined> {
  const config = await loadConfig();
  return config.sandboxes[name];
}

export async function putSandbox(entry: SandboxEntry): Promise<void> {
  await withConfig((config) => {
    config.sandboxes[entry.name] = entry;
  });
}

export async function removeSandbox(name: string): Promise<boolean> {
  return withConfig((config) => {
    if (!config.sandboxes[name]) {
      return false;
    }
    delete config.sandboxes[name];
    return true;
  });
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
  validateSandboxName(newName);

  const updated = await withConfig((config) => {
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
    return updated;
  });

  try {
    const backend = await getBackend(updated.host);
    const root = await resolveRoot(updated.host);
    await backend.writeMeta(root, updated.id, updated);
  } catch {}

  return updated;
}
