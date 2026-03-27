/**
 * c64 info -- Show device info and status.
 */

import { resolveHost } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printInfo } from "../output.js";

export async function info(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  printInfo(`Connecting to ${host}...`, opts);

  // Phase 2: implement REST API call to /v1/info
  console.error("Not yet implemented. Coming in Phase 2.");
  console.error(`Will query: http://${host}/v1/info`);
}
