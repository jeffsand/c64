/**
 * c64 ls -- List files on device storage.
 */
import { resolveHost } from "../config.js";
import { NoHostConfiguredError } from "../error.js";

export async function ls(path: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  console.error("Not yet implemented. Coming in Phase 4 (file operations).");
}
