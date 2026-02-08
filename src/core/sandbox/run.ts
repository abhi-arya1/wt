import type { SandboxEntry } from "@/core/host/types";
import type { ExecResult } from "@/core/backend/types";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { requireSandbox } from "@/core/sandbox/state";
import { getBackend } from "@/core/backend";

export interface RunResult {
  name: string;
  id: string;
  host: string;
  path: string;
  command: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runInSandbox(
  name: string,
  command: string[],
  opts: { capture?: boolean },
): Promise<RunResult> {
  const entry = await requireSandbox(name);
  const backend = await getBackend(entry.host);

  const exists = await backend.dirExists(entry.path);
  if (!exists) {
    throw new SandboxError(
      SandboxErrorCode.PATH_MISSING,
      `Sandbox path does not exist: ${entry.path}`,
    );
  }

  if (opts.capture) {
    const result = await backend.exec(entry.path, command);
    return {
      name: entry.name,
      id: entry.id,
      host: entry.host,
      path: entry.path,
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  const exitCode = await backend.execStream(entry.path, command);
  return {
    name: entry.name,
    id: entry.id,
    host: entry.host,
    path: entry.path,
    command,
    exitCode,
    stdout: "",
    stderr: "",
  };
}
