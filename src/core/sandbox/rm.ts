import { loadConfig, withConfig } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { getBackend, resolveRoot } from "@/core/backend";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";

export interface RmResult {
  entry: SandboxEntry;
  cleaned: {
    dir: boolean;
    meta: boolean;
    config: boolean;
  };
}

export async function removeSandboxFull(name: string): Promise<RmResult> {
  // Read-only lookup first (no lock needed).
  const config = await loadConfig();
  const entry = config.sandboxes[name];

  if (!entry) {
    throw new SandboxError(
      SandboxErrorCode.SANDBOX_NOT_FOUND,
      `Sandbox "${name}" not found`,
    );
  }

  const backend = await getBackend(entry.host);
  const root = await resolveRoot(entry.host);

  const cleaned = { dir: false, meta: false, config: false };

  // Filesystem cleanup (outside the lock — may be slow over SSH).
  try {
    await backend.removeSandboxDir(entry.path);
    cleaned.dir = true;
  } catch {}

  try {
    await backend.removeMeta(root, entry.id);
    cleaned.meta = true;
  } catch {}

  // Atomic config update under lock.
  await withConfig((config) => {
    delete config.sandboxes[name];
  });
  cleaned.config = true;

  try {
    const mirrorPath = `${root}/mirrors/${entry.repoId}.git`;
    await backend.pruneWorktrees(mirrorPath);
  } catch {}

  return { entry, cleaned };
}
