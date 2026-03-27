/**
 * c64 mount -- Mount a disk image to a drive.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError } from "../output.js";

export async function mount(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const drive = String(opts["drive"] ?? "a");
  const client = new UltimateClient(host, resolveTimeout(opts));
  try {
    await client.mount(drive, file);
    printSuccess(`Mounted ${file} to Drive ${drive.toUpperCase()}`, opts);
  } catch (err: unknown) {
    printError(`Failed to mount ${file}: ${(err as Error).message}`);
    process.exit(3);
  }
}
