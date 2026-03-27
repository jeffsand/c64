/**
 * c64 info -- Show device info and status.
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
    } else {
      printTable([
        { label: "Product", value: device.product },
        { label: "Firmware", value: device.firmwareVersion },
        { label: "FPGA", value: device.fpgaVersion },
        { label: "Core", value: device.coreVersion },
        { label: "Hostname", value: device.hostname },
        { label: "ID", value: device.uniqueId },
      ], opts);
    }
  } catch (err: unknown) {
    const e = err as C64Error;
    if (e.help) {
      printError(e.message, e.help);
      process.exit(e.exitCode ?? 1);
    }
    throw err;
  }
}
