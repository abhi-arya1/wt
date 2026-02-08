import { HostError, HostErrorCode, type HostLabels } from "@/core/host/types";

const HOST_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

export function validateHostName(name: string): void {
  if (!name) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "Host name is required",
    );
  }
  if (!HOST_NAME_PATTERN.test(name)) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      `Host name must match pattern: starts with a-z, followed by 0-31 chars of a-z, 0-9, _, or -`,
    );
  }
}

export function validateSshTarget(ssh: string): void {
  if (!ssh || ssh.trim() === "") {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "SSH target is required",
    );
  }
}

export function validateRootPath(root: string): void {
  if (!root) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "Root path is required",
    );
  }
  if (!root.startsWith("/")) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "Root path must be absolute (start with /)",
    );
  }
}

export function validatePort(port: number | undefined): void {
  if (port === undefined) return;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "Port must be an integer between 1 and 65535",
    );
  }
}

export function validateConnectTimeout(timeout: number | undefined): void {
  if (timeout === undefined) return;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300) {
    throw new HostError(
      HostErrorCode.VALIDATION_ERROR,
      "Connect timeout must be an integer between 1 and 300 seconds",
    );
  }
}

export function parseLabels(labelsStr: string | undefined): HostLabels {
  if (!labelsStr) return {};

  const labels: HostLabels = {};
  const pairs = labelsStr.split(",");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      throw new HostError(
        HostErrorCode.VALIDATION_ERROR,
        `Invalid label format "${trimmed}": expected key=value`,
      );
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (!key) {
      throw new HostError(
        HostErrorCode.VALIDATION_ERROR,
        `Invalid label: empty key in "${trimmed}"`,
      );
    }

    labels[key] = value;
  }

  return labels;
}

export function validateHostInput(input: {
  name: string;
  ssh: string;
  root: string;
  port?: number;
  connectTimeout?: number;
}): void {
  validateHostName(input.name);
  validateSshTarget(input.ssh);
  validateRootPath(input.root);
  validatePort(input.port);
  validateConnectTimeout(input.connectTimeout);
}
