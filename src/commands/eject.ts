/**
 * c64 eject -- Eject disk from a drive.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError } from "../output.js";

export async function eject(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const client = new UltimateClient(host, resolveTimeout(opts));
  const drives = opts["all"] ? ["a", "b"] : [String(opts["drive"] ?? "a")];
  try {
    for (const drive of drives) {
      await client.eject(drive);
      printSuccess(`Ejected Drive ${drive.toUpperCase()}`, opts);
    }
  } catch (err: unknown) {
    printError(`Failed to eject: ${(err as Error).message}`);
    process.exit(3);
  }
}
