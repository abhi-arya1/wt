import { listSandboxes } from "@/core/sandbox/state";
import type { SandboxEntry } from "@/core/host/types";

export interface LsOptions {
  hostName?: string;
}

export interface LsResult {
  sandboxes: SandboxEntry[];
  total: number;
}

export async function listSandboxesFiltered(opts: LsOptions): Promise<LsResult> {
  const all = await listSandboxes();
  const sandboxes = opts.hostName
    ? all.filter((e) => e.host === opts.hostName)
    : all;
  return { sandboxes, total: sandboxes.length };
}
