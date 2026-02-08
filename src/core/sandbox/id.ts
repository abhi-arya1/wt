import { nanoid } from "nanoid";

export function generateSandboxId(): string {
  return nanoid(12);
}

export async function computeRepoId(originUrl: string): Promise<string> {
  const normalized = originUrl.replace(/\.git$/, "").toLowerCase().trim();
  const data = new TextEncoder().encode(normalized);
  const hash = new Bun.CryptoHasher("sha256").update(data).digest("hex");
  return hash.slice(0, 16);
}
