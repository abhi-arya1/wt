export interface SandboxRecord {
  name: string;
  id: string;
  host: string;
  origin: string;
  repoId: string;
  ref: string;
  path: string;
  createdAt: string;
}

export enum SandboxErrorCode {
  NOT_IN_GIT_REPO = "NOT_IN_GIT_REPO",
  HOST_NOT_FOUND = "HOST_NOT_FOUND",
  SANDBOX_NOT_FOUND = "SANDBOX_NOT_FOUND",
  SANDBOX_EXISTS = "SANDBOX_EXISTS",
  CREATION_FAILED = "CREATION_FAILED",
  PATH_MISSING = "PATH_MISSING",
  GIT_ERROR = "GIT_ERROR",
  EXEC_FAILED = "EXEC_FAILED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export class SandboxError extends Error {
  constructor(
    public code: SandboxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}
