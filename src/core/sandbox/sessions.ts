import type { TmuxSession } from "@/core/backend/types";
import { getBackend } from "@/core/backend";

export interface SessionsResult {
  host: string;
  sessions: TmuxSession[];
  ok: boolean;
  warnings: string[];
}

export async function listWtSessions(hostName: string): Promise<SessionsResult> {
  const backend = await getBackend(hostName);
  const tmuxCheck = await backend.checkTmux();

  if (!tmuxCheck.ok) {
    return {
      host: hostName,
      sessions: [],
      ok: true,
      warnings: ["tmux not installed"],
    };
  }

  const sessions = await backend.listTmuxSessions();
  return {
    host: hostName,
    sessions,
    ok: true,
    warnings: [],
  };
}
