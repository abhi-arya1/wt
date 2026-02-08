import ms, { type StringValue } from "ms";
import { loadConfig, saveConfig, LOCAL_HOST_NAME } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { getBackend, resolveRoot } from "@/core/backend";

export interface GcOptions {
  hostName?: string;
  olderThan: string;
  dryRun: boolean;
}

export interface GcResult {
  deleted: SandboxEntry[];
  kept: SandboxEntry[];
  errors: Array<{ sandbox: string; error: string }>;
}

export async function garbageCollect(opts: GcOptions): Promise<GcResult> {
  const threshold = ms(opts.olderThan as StringValue);
  if (threshold === undefined || threshold <= 0) {
    throw new Error(`Invalid duration: ${opts.olderThan}`);
  }

  const config = await loadConfig();
  const now = Date.now();
  const cutoff = now - threshold;

  const entries = Object.values(config.sandboxes);
  const targets = opts.hostName
    ? entries.filter((e) => e.host === opts.hostName)
    : entries;

  const deleted: SandboxEntry[] = [];
  const kept: SandboxEntry[] = [];
  const errors: Array<{ sandbox: string; error: string }> = [];

  const mirrorsToPrune = new Set<string>();

  for (const entry of targets) {
    const createdMs = new Date(entry.createdAt).getTime();
    let isStale = createdMs < cutoff;

    if (!isStale) {
      try {
        const backend = await getBackend(entry.host);
        const exists = await backend.dirExists(entry.path);
        if (!exists) {
          isStale = true;
        }
      } catch {
        isStale = true;
      }
    }

    if (!isStale) {
      kept.push(entry);
      continue;
    }

    if (opts.dryRun) {
      deleted.push(entry);
      continue;
    }

    try {
      const backend = await getBackend(entry.host);
      const root = await resolveRoot(entry.host);

      await backend.removeSandboxDir(entry.path);
      await backend.removeMeta(root, entry.id);
      mirrorsToPrune.add(`${entry.host}:${root}/mirrors/${entry.repoId}.git`);

      delete config.sandboxes[entry.name];
      deleted.push(entry);
    } catch (err) {
      errors.push({
        sandbox: entry.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!opts.dryRun && deleted.length > 0) {
    await saveConfig(config);
  }

  if (!opts.dryRun) {
    for (const key of mirrorsToPrune) {
      const [hostName, mirrorPath] = key.split(":", 2);
      try {
        const backend = await getBackend(hostName);
        await backend.pruneWorktrees(mirrorPath);
      } catch {}
    }
  }

  return { deleted, kept, errors };
}
