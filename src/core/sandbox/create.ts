import { LOCAL_HOST_NAME } from "@/core/host/config";
import type { SandboxEntry } from "@/core/host/types";
import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";
import { generateSandboxId, computeRepoId } from "@/core/sandbox/id";
import { getOriginUrl, getHeadSha } from "@/core/sandbox/git";
import { getSandbox, putSandbox } from "@/core/sandbox/state";
import { getBackend, resolveRoot } from "@/core/backend";

export interface CreateSandboxInput {
  name: string;
  hostName: string;
  ref?: string;
}

export interface CreateSandboxResult {
  entry: SandboxEntry;
  isIdempotent: boolean;
}

export async function createSandbox(
  input: CreateSandboxInput,
): Promise<CreateSandboxResult> {
  const origin = await getOriginUrl();
  const repoId = await computeRepoId(origin);
  const ref = input.ref ?? (await getHeadSha());
  const backend = await getBackend(input.hostName);
  const root = await resolveRoot(input.hostName);

  const existing = await getSandbox(input.name);
  if (existing) {
    if (existing.host === input.hostName && existing.repoId === repoId) {
      const exists = await backend.dirExists(existing.path);
      if (exists) {
        return { entry: existing, isIdempotent: true };
      }
    }
    throw new SandboxError(
      SandboxErrorCode.SANDBOX_EXISTS,
      `Sandbox "${input.name}" already exists (host=${existing.host}, repoId=${existing.repoId})`,
    );
  }

  const sandboxId = generateSandboxId();
  const sandboxPath = `${root}/sandboxes/${sandboxId}`;

  try {
    await backend.ensureLayout(root);
    const mirrorPath = await backend.ensureMirror(root, repoId, origin);
    await backend.createWorktree(mirrorPath, sandboxPath, ref);
    await backend.copyEnvFiles(process.cwd(), sandboxPath);

    const entry: SandboxEntry = {
      name: input.name,
      id: sandboxId,
      host: input.hostName,
      origin,
      repoId,
      ref,
      path: sandboxPath,
      createdAt: new Date().toISOString(),
    };

    await backend.writeMeta(root, sandboxId, entry);
    await putSandbox(entry);
    return { entry, isIdempotent: false };
  } catch (error) {
    if (error instanceof SandboxError) throw error;
    throw new SandboxError(
      SandboxErrorCode.CREATION_FAILED,
      error instanceof Error ? error.message : String(error),
    );
  }
}
