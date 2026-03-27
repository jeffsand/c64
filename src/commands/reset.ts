/**
 * c64 reset -- Reset the C64.
 */
import { UltimateClient } from "../api/rest.js";
import { tcpReset } from "../api/socket.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError } from "../output.js";

export async function reset(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  try {
    if (opts["hard"]) {
      await tcpReset(host, resolveTimeout(opts));
      printSuccess("Hard reset sent via TCP", opts);
    } else {
      const client = new UltimateClient(host, resolveTimeout(opts));
      await client.reset();
      printSuccess("Reset sent", opts);
    }
  } catch (err: unknown) {
    printError(`Failed to reset: ${(err as Error).message}`);
    process.exit(3);
  }
}
