export type {
  HostConfig,
  HostLabels,
  HostStatus,
  AddHostInput,
  AddHostResult,
  CheckHostResult,
  CheckStatus,
  ListHostsResult,
  WtConfig,
  SandboxEntry,
} from "@/core/host/types";

export { HostError, HostErrorCode } from "@/core/host/types";

export {
  LOCAL_HOST_NAME,
  getConfigPath,
  loadConfig,
  saveConfig,
  getHost,
  getDefaultHost,
  updateHost,
  setDefaultHost,
  removeHost,
} from "@/core/host/config";

export {
  validateHostName,
  validateSshTarget,
  validateRootPath,
  validatePort,
  validateConnectTimeout,
  validateHostInput,
  parseLabels,
} from "@/core/host/validate";

export { addHost } from "@/core/host/add";
export { listHosts } from "@/core/host/list";
export {
  checkHost,
  checkHostConfig,
  checkAndUpdateHost,
} from "@/core/host/check";
