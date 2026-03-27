/**
 * c64 reboot
 */

import { resolveHost } from "../config.js";
import { NoHostConfiguredError } from "../error.js";

export async function reboot(...args: unknown[]): Promise<void> {
  const opts = args[args.length - 1] as Record<string, unknown>;
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  console.error("Not yet implemented. Coming in Phase 2.");
}
