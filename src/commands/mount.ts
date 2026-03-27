/**
 * c64 mount -- Mount a disk image to a drive.
 *
 * Supports direct paths, URLs, zip archives, and directories.
 * Local/downloaded files are resolved first, then sent to the device.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";
import { resolve } from "../resolve.js";

export async function mount(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const drive = String(opts["drive"] ?? "a");
  const client = new UltimateClient(host, resolveTimeout(opts));

  try {
    const resolved = await resolve(file);
    const mountPath = resolved.path;

    if (resolved.cleanup) {
      printInfo("Note: upload not yet implemented -- resolved file is local only.", opts);
    }

    await client.mount(drive, mountPath);
    printSuccess(`Mounted ${resolved.originalName} to Drive ${drive.toUpperCase()}`, opts);
  } catch (err: unknown) {
    printError(`Failed to mount ${file}: ${(err as Error).message}`);
    process.exit(3);
  }
}
