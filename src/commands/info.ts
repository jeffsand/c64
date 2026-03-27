/**
 * c64 info -- Show device info and status.
 *
 * In pretty mode, also fetches and displays drive status below device info.
 * In --json mode, only outputs the device info object (use 'c64 drives --json' for drives).
 */

import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, type C64Error } from "../error.js";
import { printTable, printData, printError } from "../output.js";

export async function info(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  const client = new UltimateClient(host, resolveTimeout(opts));

  try {
    const device = await client.info();

    if (opts["json"]) {
      printData(device, opts);
      return;
    }

    const rows = [
      { label: "Product", value: device.product },
      { label: "Firmware", value: device.firmwareVersion },
      { label: "FPGA", value: device.fpgaVersion },
      { label: "Core", value: device.coreVersion },
      { label: "Hostname", value: device.hostname },
      { label: "ID", value: device.uniqueId },
    ];

    // Also fetch drive status for the pretty view
    try {
      const drives = await client.drives();
      for (const drive of drives) {
        const label = `Drive ${drive.id.toUpperCase()}`;
        const image = drive.imageFile || "(empty)";
        rows.push({ label, value: `${drive.driveType} -- ${image}` });
      }
    } catch {
      // If drives fetch fails, just show device info without drives
    }

    printTable(rows, opts);
  } catch (err: unknown) {
    const e = err as C64Error;
    if (e.help) {
      printError(e.message, e.help);
      process.exit(e.exitCode ?? 1);
    }
    throw err;
  }
}
