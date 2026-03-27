/**
 * c64 reboot -- Reboot the Ultimate hardware.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError } from "../output.js";

export async function reboot(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  try {
    const client = new UltimateClient(host, resolveTimeout(opts));
    await client.reboot();
    printSuccess("Reboot sent -- device will restart", opts);
  } catch (err: unknown) {
    printError(`Failed to reboot: ${(err as Error).message}`);
    process.exit(3);
  }
}
