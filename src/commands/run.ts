/**
 * c64 run -- Auto-detect file type and run (CRT/PRG/D64).
 *
 * Supports device paths, local files, URLs, zip archives, and directories.
 * Local files are uploaded to /Temp/ on the device first.
 */
import { basename, extname } from "node:path";
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, UnsupportedFormatError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";
import { resolve } from "../resolve.js";
import { ftpUpload } from "./upload.js";

export async function run(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const client = new UltimateClient(host, resolveTimeout(opts));
  const timeout = resolveTimeout(opts);

  try {
    // Device path -- send directly
    let remotePath: string;
    let displayName: string;

    if (file.startsWith("/")) {
      remotePath = file;
      displayName = basename(file);
    } else {
      // Resolve and upload
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

    const ext = extname(remotePath).toLowerCase().replace(".", "");
    switch (ext) {
      case "crt":
        printInfo(`Running cartridge: ${displayName}`, opts);
        await client.runCrt(remotePath);
        break;
      case "prg":
        printInfo(`Running PRG: ${displayName}`, opts);
        await client.runPrg(remotePath);
        break;
      case "d64": case "g64": case "t64":
        printInfo(`Mounting: ${displayName}`, opts);
        await client.mount("a", remotePath);
        break;
      default:
        throw new UnsupportedFormatError(displayName);
    }
    printSuccess(`Running ${displayName}`, opts);
  } catch (err: unknown) {
    if (err instanceof UnsupportedFormatError) {
      printError(err.message, err.help); process.exit(err.exitCode);
    }
    printError(`Failed to run: ${(err as Error).message}`);
    process.exit(3);
  }
}
