/**
 * c64 play -- Full play sequence: mount, reset, LOAD, RUN.
 *
 * Supports device paths, local files, URLs, zip archives, and directories.
 * Local files are uploaded to /Temp/ on the device first.
 */
import { basename } from "node:path";
import { UltimateClient } from "../api/rest.js";
import { tcpReset, tcpType } from "../api/socket.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printInfo, printSuccess, printError } from "../output.js";
import { resolve } from "../resolve.js";
import { ftpUpload } from "./upload.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
    let remotePath: string;
    let displayName: string;

    if (file.startsWith("/")) {
      remotePath = file;
      displayName = basename(file);
    } else {
      const resolved = await resolve(file);
      displayName = resolved.originalName;
      const safeName = basename(resolved.path).replace(/ /g, "_").replace(/'/g, "").replace(/"/g, "");
      remotePath = `/Temp/${safeName}`;

      printInfo(`Uploading ${displayName} to device...`, opts);
      if (!ftpUpload(host, resolved.path, remotePath, timeout)) {
        printError(`Failed to upload ${displayName}`, `Check device FTP at ${host}:21`);
        process.exit(3);
      }
    }

    printInfo(`Mounting ${displayName} to Drive ${drive.toUpperCase()}...`, opts);
    await client.mount(drive, remotePath);

    printInfo("Resetting C64...", opts);
    await tcpReset(host, timeout);
    await sleep(bootDelay);

    const driveNum = drive === "b" ? "9" : "8";
    printInfo(`Typing: LOAD"*",${driveNum},1`, opts);
    await tcpType(host, `LOAD"*",${driveNum},1\r`, timeout);
    await sleep(loadDelay);

    printInfo("Typing: RUN", opts);
    await tcpType(host, "RUN\r", timeout);

    printSuccess(`Playing ${displayName}`, opts);
  } catch (err: unknown) {
    printError(`Failed to play: ${(err as Error).message}`);
    process.exit(3);
  }
}
