import type { WtConfig, HostConfig, SandboxEntry } from "@/core/host/types";

export const LOCAL_HOST_NAME = "local";

export function getConfigPath(): string {
  const home = Bun.env.HOME || Bun.env.USERPROFILE || "~";
  return `${home}/.config/wt/config.json`;
}

function createLocalHost(): HostConfig {
  const now = new Date().toISOString();
  return {
    name: LOCAL_HOST_NAME,
    ssh: "",
    root: "",
    connectTimeout: 10,
    labels: {},
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: now,
    lastStatus: "ok",
  };
}

export function createEmptyConfig(): WtConfig {
  return {
    version: 1,
    defaultHost: LOCAL_HOST_NAME,
    hosts: {
      [LOCAL_HOST_NAME]: createLocalHost(),
    },
    sandboxes: {},
  };
}

export async function loadConfig(): Promise<WtConfig> {
  const configPath = getConfigPath();
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    return createEmptyConfig();
  }

  try {
    const content = await file.json();
    if (content.version !== 1) {
      throw new Error(`Unsupported config version: ${content.version}`);
    }
    if (!content.sandboxes) {
      content.sandboxes = {};
    }
    if (!content.hosts[LOCAL_HOST_NAME]) {
      content.hosts[LOCAL_HOST_NAME] = createLocalHost();
    }
    if (!content.defaultHost) {
      content.defaultHost = LOCAL_HOST_NAME;
    }
    return content as WtConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid config file at ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

export async function saveConfig(config: WtConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = configPath.slice(0, configPath.lastIndexOf("/"));

  await Bun.$`mkdir -p ${configDir}`.quiet();

  const content = JSON.stringify(config, null, 2);
  await Bun.write(configPath, content);
}

export async function getHost(name: string): Promise<HostConfig | undefined> {
  const config = await loadConfig();
  return config.hosts[name];
}

export async function getDefaultHost(): Promise<HostConfig | undefined> {
  const config = await loadConfig();
  if (!config.defaultHost) {
    return undefined;
  }
  return config.hosts[config.defaultHost];
}

export async function updateHost(host: HostConfig): Promise<void> {
  const config = await loadConfig();
  config.hosts[host.name] = host;
  await saveConfig(config);
}

export async function setDefaultHost(name: string | null): Promise<void> {
  const config = await loadConfig();
  if (name !== null && !config.hosts[name]) {
    throw new Error(`Host "${name}" not found`);
  }
  config.defaultHost = name;
  await saveConfig(config);
}

export async function removeHost(name: string): Promise<boolean> {
  const config = await loadConfig();
  if (!config.hosts[name]) {
    return false;
  }
  delete config.hosts[name];
  if (config.defaultHost === name) {
    config.defaultHost = null;
  }
  await saveConfig(config);
  return true;
}
