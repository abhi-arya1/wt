import { requireSandbox } from "@/core/sandbox/state";
import type { SandboxEntry } from "@/core/host/types";
import { getBackend } from "@/core/backend";

export interface SandboxStatus {
  entry: SandboxEntry;
  dirExists: boolean;
  tmuxSession: string | null;
  age: string;
}

function humanAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export async function getSandboxStatus(name: string): Promise<SandboxStatus> {
  const entry = await requireSandbox(name);
  const backend = await getBackend(entry.host);

  let dirExists = false;
  try {
    dirExists = await backend.dirExists(entry.path);
  } catch {}

  let tmuxSession: string | null = null;
  try {
    const sessions = await backend.listTmuxSessions();
    const sessionName = `wt-${entry.id}`;
    const match = sessions.find((s) => s.name === sessionName);
    if (match) {
      tmuxSession = match.name;
    }
  } catch {}

  return {
    entry,
    dirExists,
    tmuxSession,
    age: humanAge(entry.createdAt),
  };
}
