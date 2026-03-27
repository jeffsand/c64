/**
 * c64 upload -- Upload a file to the device.
 */
import { resolveHost } from "../config.js";
import { NoHostConfiguredError } from "../error.js";

export async function upload(local: string, remote: string | undefined, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  console.error("Not yet implemented. Coming in Phase 4 (file operations).");
}
