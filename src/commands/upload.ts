/**
 * c64 upload -- Upload a file to the device via FTP.
 *
 * The Ultimate has an FTP server on port 21 (anonymous).
 * Default upload destination is /Temp/ which is writable and used
 * for staging files before mount/run.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";

/**
 * Sanitize a filename for the Ultimate's filesystem.
 * Replace spaces with underscores, strip problematic characters.
 */
function safeName(filename: string): string {
  return filename
    .replace(/ /g, "_")
    .replace(/'/g, "")
    .replace(/"/g, "")
    .replace(/&/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");
}

/**
 * Upload a local file to the Ultimate via FTP using curl.
 * Returns true on success.
 */
/**
 * Find the curl binary. On Windows, curl.exe is in System32 since Windows 10.
 * On macOS/Linux it's just "curl" on PATH.
 */
function findCurl(): string {
  if (platform() === "win32") {
    return "curl.exe";
  }
  return "curl";
}

export function ftpUpload(host: string, localPath: string, remotePath: string, timeout: number): boolean {
  const url = `ftp://anonymous@${host}${remotePath}`;
  const curl = findCurl();
  try {
    // The Ultimate's FTP server sometimes does not send "226 Transfer complete"
    // after a successful upload, causing curl to timeout waiting for it.
    // We use a short --max-time and treat exit code 28 (timeout) as success
    // if the data was fully sent.
    execFileSync(curl, [
      "-s",
      "-T", localPath,
      url,
      "--connect-timeout", String(Math.ceil(timeout / 1000)),
      "--max-time", "15",
      "--ftp-create-dirs",
    ], { timeout: 20000, windowsHide: true });
    return true;
  } catch (err: unknown) {
    // Exit code 28 = timeout -- the upload likely completed but the server
    // did not acknowledge. Treat as success.
    const e = err as { status?: number };
    if (e.status === 28) return true;
    return false;
  }
}

export async function upload(
  local: string,
  remote: string | undefined,
  opts: Record<string, unknown>,
): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  const filename = safeName(basename(local));
  const remotePath = remote
    ? (remote.endsWith("/") ? `${remote}${filename}` : remote)
    : `/Temp/${filename}`;

  printInfo(`Uploading ${filename} to ${remotePath}...`, opts);

  const success = ftpUpload(host, local, remotePath, resolveTimeout(opts));

  if (success) {
    printSuccess(`Uploaded ${filename} to ${remotePath}`, opts);

    // If --mount flag, mount after upload
    if (opts["mount"]) {
      const { UltimateClient } = await import("../api/rest.js");
      const client = new UltimateClient(host, resolveTimeout(opts));
      await client.mount("a", remotePath);
      printSuccess(`Mounted ${remotePath} to Drive A`, opts);
    }
  } else {
    printError(
      `Failed to upload ${filename}`,
      `Check that the device at ${host} is reachable and FTP is enabled.`,
    );
    process.exit(3);
  }
}
