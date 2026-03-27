/**
 * c64 play -- Full play sequence: mount, reset, LOAD, RUN.
 *
 * Supports direct paths, URLs, zip archives, and directories.
 * Resolves the input first, then runs the full boot sequence.
 */
import { UltimateClient } from "../api/rest.js";
import { tcpReset, tcpType } from "../api/socket.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printInfo, printSuccess, printError } from "../output.js";
import { resolve } from "../resolve.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function play(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const drive = String(opts["drive"] ?? "a");
  const bootDelay = parseInt(String(opts["bootDelay"] ?? "3000"), 10);
  const loadDelay = parseInt(String(opts["loadDelay"] ?? "6000"), 10);
  const client = new UltimateClient(host, resolveTimeout(opts));
  const timeout = resolveTimeout(opts);

  try {
    const resolved = await resolve(file);

    if (resolved.cleanup) {
      printInfo("Note: upload not yet implemented -- resolved file is local only.", opts);
    }

    printInfo(`Mounting ${resolved.originalName} to Drive ${drive.toUpperCase()}...`, opts);
    await client.mount(drive, resolved.path);

    printInfo("Resetting C64...", opts);
    await tcpReset(host, timeout);
    await sleep(bootDelay);

    const driveNum = drive === "b" ? "9" : "8";
    printInfo(`Typing: LOAD"*",${driveNum},1`, opts);
    await tcpType(host, `LOAD"*",${driveNum},1\r`, timeout);
    await sleep(loadDelay);

    printInfo("Typing: RUN", opts);
    await tcpType(host, "RUN\r", timeout);

    printSuccess(`Playing ${resolved.originalName}`, opts);
  } catch (err: unknown) {
    printError(`Failed to play: ${(err as Error).message}`);
    process.exit(3);
  }
}
