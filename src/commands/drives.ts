/**
 * c64 drives -- Show drive status.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, type C64Error } from "../error.js";
import { printData, printError } from "../output.js";

export async function drives(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const client = new UltimateClient(host, resolveTimeout(opts));
  try {
    const status = await client.drives();
    if (opts["json"]) { printData(status, opts); return; }
    for (const drive of status) {
      const label = `Drive ${drive.id.toUpperCase()}`;
      const image = drive.imageFile || "(empty)";
      console.log(`  ${label}: ${drive.driveType} -- ${image}`);
    }
    if (status.length === 0) console.log("  No drive information available.");
  } catch (err: unknown) {
    const e = err as C64Error;
    if (e.help) { printError(e.message, e.help); process.exit(e.exitCode ?? 1); }
    throw err;
  }
}
