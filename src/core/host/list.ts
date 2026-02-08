import type { ListHostsResult } from "@/core/host/types";
import { loadConfig } from "@/core/host/config";

export async function listHosts(): Promise<ListHostsResult> {
  const config = await loadConfig();

  const hosts = Object.values(config.hosts).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    defaultHost: config.defaultHost,
    hosts,
  };
}
