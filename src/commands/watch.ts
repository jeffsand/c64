/**
 * c64 watch -- Poll drive status and display changes.
 *
 * Polls the device every 2 seconds and prints a line when
 * something changes. Runs until Ctrl+C.
 */

import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, type C64Error } from "../error.js";
import { printError, printInfo } from "../output.js";
import type { DriveStatus } from "../api/types.js";

function timestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false });
}

function driveLabel(drive: DriveStatus): string {
  const id = `Drive ${drive.id.toUpperCase()}`;
  const image = drive.imageFile || "(empty)";
  return `${id}: ${drive.driveType} -- ${image}`;
}

function statusKey(drives: DriveStatus[]): string {
  return drives.map((d) => `${d.id}:${d.imageFile}`).join("|");
}

export async function watch(opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  const client = new UltimateClient(host, resolveTimeout(opts));

  printInfo(`Watching C64 Ultimate at ${host} (Ctrl+C to stop)\n`, opts);

  let lastKey = "";
  let isFirst = true;

  const poll = async (): Promise<void> => {
    try {
      const drives = await client.drives();
      const key = statusKey(drives);
      const ts = timestamp();

      if (isFirst) {
        for (const drive of drives) {
          console.log(`${ts}  ${driveLabel(drive)}`);
        }
        if (drives.length === 0) {
          console.log(`${ts}  No drive information available.`);
        }
        lastKey = key;
        isFirst = false;
      } else if (key !== lastKey) {
        for (const drive of drives) {
          console.log(`${ts}  ${driveLabel(drive)}    [changed]`);
        }
        lastKey = key;
      }
    } catch (err: unknown) {
      const ts = timestamp();
      const e = err as C64Error;
      if (e.help) {
        console.error(`${ts}  Connection lost: ${e.message}`);
      } else {
        console.error(`${ts}  Error: ${(err as Error).message ?? err}`);
      }
    }
  };

  // Initial poll
  await poll();

  // Set up interval
  const interval = setInterval(poll, 2000);

  // Clean shutdown on SIGINT
  const cleanup = (): void => {
    clearInterval(interval);
    console.log("");
    printInfo("Stopped watching.", opts);
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep the process alive
  await new Promise<void>(() => {
    // Never resolves -- runs until SIGINT
  });
}
