export {
  SandboxError,
  SandboxErrorCode,
  type SandboxRecord,
} from "@/core/sandbox/types";

export {
  generateSandboxId,
  computeRepoId,
} from "@/core/sandbox/id";

export {
  getOriginUrl,
  getHeadSha,
  getRepoRoot,
  isInsideGitRepo,
  getCurrentBranch,
  sanitizeBranchName,
} from "@/core/sandbox/git";

export {
  getSandbox,
  putSandbox,
  removeSandbox,
  listSandboxes,
  requireSandbox,
  renameSandbox,
} from "@/core/sandbox/state";

export {
  createSandbox,
  type CreateSandboxInput,
  type CreateSandboxResult,
} from "@/core/sandbox/create";

export {
  enterSandbox,
  enterSandboxTmux,
  buildEnterCommand,
} from "@/core/sandbox/enter";

export {
  runInSandbox,
  type RunResult,
} from "@/core/sandbox/run";

export {
  listWtSessions,
  type SessionsResult,
} from "@/core/sandbox/sessions";

export {
  garbageCollect,
  type GcOptions,
  type GcResult,
} from "@/core/sandbox/gc";

export {
  runDoctor,
  type DoctorResult,
} from "@/core/sandbox/doctor";

export {
  bootstrapHost,
  type BootstrapOptions,
  type BootstrapResult,
} from "@/core/sandbox/bootstrap";

export {
  listSandboxesFiltered,
  type LsOptions,
  type LsResult,
} from "@/core/sandbox/ls";

export {
  removeSandboxFull,
  type RmResult,
} from "@/core/sandbox/rm";

export {
  getSandboxStatus,
  type SandboxStatus,
} from "@/core/sandbox/status";
