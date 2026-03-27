/**
 * c64 mount -- Mount a disk image to a drive.
 *
 * Supports direct device paths, local files, URLs, zip archives, and directories.
 * Local/downloaded files are uploaded to /Temp/ on the device, then mounted.
 */
import { basename } from "node:path";
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";
import { resolve } from "../resolve.js";
import { ftpUpload } from "./upload.js";

export async function mount(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const drive = String(opts["drive"] ?? "a");
  const client = new UltimateClient(host, resolveTimeout(opts));
  const timeout = resolveTimeout(opts);

  try {
    // If the path starts with /, it's already on the device -- mount directly
    if (file.startsWith("/")) {
      await client.mount(drive, file);
      printSuccess(`Mounted ${file} to Drive ${drive.toUpperCase()}`, opts);
      return;
    }

    // Resolve local file, URL, zip, or directory to a playable file
    const resolved = await resolve(file);

    // Upload to /Temp/ on the device, then mount from there
    const safeName = basename(resolved.path)
      .replace(/ /g, "_")
      .replace(/'/g, "")
      .replace(/"/g, "");
    const remotePath = `/Temp/${safeName}`;

    printInfo(`Uploading ${resolved.originalName} to device...`, opts);
    const uploaded = ftpUpload(host, resolved.path, remotePath, timeout);

    if (!uploaded) {
      printError(
        `Failed to upload ${resolved.originalName}`,
        `Check that the device at ${host} is reachable and FTP is enabled.`,
      );
      process.exit(3);
    }

    await client.mount(drive, remotePath);
    printSuccess(`Mounted ${resolved.originalName} to Drive ${drive.toUpperCase()}`, opts);
  } catch (err: unknown) {
    printError(`Failed to mount ${file}: ${(err as Error).message}`);
    process.exit(3);
  }
}
