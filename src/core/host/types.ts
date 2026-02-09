export type HostLabels = Record<string, string>;

export type HostStatus = "ok" | "error" | "unchecked";

export interface PortMapping {
  localPort: number;
  hostPort: number;
}

export interface HostConfig {
  name: string;
  ssh: string;
  root: string;
  port?: number;
  identity?: string;
  connectTimeout: number;
  labels: HostLabels;
  portMappings?: PortMapping[];
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  lastStatus: HostStatus;
}

export interface AddHostInput {
  name: string;
  ssh: string;
  root: string;
  port?: number;
  identity?: string;
  connectTimeout?: number;
  labels?: HostLabels;
  setDefault?: boolean;
  skipCheck?: boolean;
}

export interface AddHostResult {
  ok: true;
  action: "created" | "updated";
  host: HostConfig;
  checkResult?: CheckHostResult;
}

export interface SandboxEntry {
  name: string;
  id: string;
  host: string;
  origin: string;
  repoId: string;
  ref: string;
  path: string;
  createdAt: string;
}

export interface WtConfig {
  version: 1;
  defaultHost: string | null;
  hosts: Record<string, HostConfig>;
  sandboxes: Record<string, SandboxEntry>;
}

export interface CheckStatus {
  ok: boolean;
  warning?: boolean;
  error?: string;
  version?: string;
}

export interface CheckHostResult {
  ok: boolean;
  host: string;
  checks: {
    ssh: CheckStatus;
    directories: CheckStatus;
    git: CheckStatus;
    node: CheckStatus;
  };
  errors: string[];
  warnings: string[];
}

export interface ListHostsResult {
  defaultHost: string | null;
  hosts: HostConfig[];
}

export enum HostErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  HOST_NOT_FOUND = "HOST_NOT_FOUND",
  SSH_CONNECTION_FAILED = "SSH_CONNECTION_FAILED",
  CAPABILITY_CHECK_FAILED = "CAPABILITY_CHECK_FAILED",
  CONFIG_ERROR = "CONFIG_ERROR",
}

export class HostError extends Error {
  constructor(
    public code: HostErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HostError";
  }
}
