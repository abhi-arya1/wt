import { SandboxError, SandboxErrorCode } from "@/core/sandbox/types";

export async function getOriginUrl(): Promise<string> {
  try {
    const result = await Bun.$`git remote get-url origin`.quiet().nothrow();
    if (result.exitCode !== 0) {
      throw new SandboxError(
        SandboxErrorCode.GIT_ERROR,
        "No git remote 'origin' found",
      );
    }
    return result.stdout.toString().trim();
  } catch (error) {
    if (error instanceof SandboxError) throw error;
    throw new SandboxError(
      SandboxErrorCode.NOT_IN_GIT_REPO,
      "Not inside a git repository",
    );
  }
}

export async function getHeadSha(): Promise<string> {
  const result = await Bun.$`git rev-parse HEAD`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new SandboxError(
      SandboxErrorCode.GIT_ERROR,
      "Failed to resolve HEAD",
    );
  }
  return result.stdout.toString().trim();
}

export async function getRepoRoot(): Promise<string> {
  const result = await Bun.$`git rev-parse --show-toplevel`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new SandboxError(
      SandboxErrorCode.NOT_IN_GIT_REPO,
      "Not inside a git repository",
    );
  }
  return result.stdout.toString().trim();
}

export async function isInsideGitRepo(): Promise<boolean> {
  const result = await Bun.$`git rev-parse --is-inside-work-tree`.quiet().nothrow();
  return result.exitCode === 0;
}

export async function getCurrentBranch(): Promise<string | null> {
  const result = await Bun.$`git rev-parse --abbrev-ref HEAD`.quiet().nothrow();
  if (result.exitCode !== 0) return null;
  const branch = result.stdout.toString().trim();
  return branch === "HEAD" ? null : branch;
}

export function sanitizeBranchName(ref: string): string {
  const name = ref.includes("/") ? ref.split("/").pop()! : ref;
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "");
  // Prevent path traversal via "." or ".." as sandbox names
  if (!sanitized || sanitized === "." || sanitized === "..") {
    return "sandbox";
  }
  return sanitized;
}

/**
 * Strip embedded credentials from a git remote URL.
 *
 * HTTPS URLs may contain user:token@ credentials that should not be
 * persisted to config files or displayed in output.
 */
export function stripCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
      return parsed.toString();
    }
    return url;
  } catch {
    // SSH-style URLs (git@host:org/repo) don't have embedded credentials
    return url;
  }
}
