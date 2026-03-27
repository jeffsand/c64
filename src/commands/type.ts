/**
 * c64 type -- Type text on the C64 keyboard.
 */

import { resolveHost } from "../config.js";
import { NoHostConfiguredError } from "../error.js";

export async function typeText(text: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  console.error("Not yet implemented. Coming in Phase 3 (TCP protocol).");
  console.error(`Will type on C64 at ${host}: ${text}`);
}
