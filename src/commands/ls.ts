/**
 * c64 ls -- List files on device storage.
 *
 * The Ultimate has an FTP server on port 21 (anonymous).
 * Uses curl to get directory listings.
 */

import { execFileSync } from "node:child_process";
import { basename, extname } from "node:path";
import { platform } from "node:os";
import chalk from "chalk";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printData, printError, printInfo } from "../output.js";

/** Known C64 file extensions for highlighting. */
const C64_EXTENSIONS = new Set([
  ".d64", ".g64", ".t64", ".crt", ".prg", ".sid", ".tap",
  ".d71", ".d81", ".d80", ".d82",
]);

const ARCHIVE_EXTENSIONS = new Set([".zip", ".gz", ".7z"]);

/**
 * List a directory on the Ultimate via FTP using curl.
 * Returns an array of filenames, or null on failure.
 */
function ftpList(host: string, path: string, timeout: number): string[] | null {
  // Ensure path ends with /
  const dirPath = path.endsWith("/") ? path : path + "/";
  const url = `ftp://anonymous@${host}${dirPath}`;

  try {
    const curl = platform() === "win32" ? "curl.exe" : "curl";
    const output = execFileSync(curl, [
      "-s",
      "--list-only",
      url,
      "--connect-timeout", String(Math.ceil(timeout / 1000)),
      "--max-time", "15",
    ], { encoding: "utf-8", timeout: 20000, windowsHide: true });

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (err: unknown) {
    // Exit code 28 = timeout -- the Ultimate FTP may timeout after sending data.
    // If we got stdout, treat it as success.
    const e = err as { status?: number; stdout?: string };
    if (e.status === 28 && e.stdout) {
      return e.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }
    return null;
  }
}

/**
 * Colorize a filename based on its extension.
 */
function colorizeFilename(name: string, opts: Record<string, unknown>): string {
  if (opts["color"] === false) return name;

  const ext = extname(name).toLowerCase();
  if (C64_EXTENSIONS.has(ext)) return chalk.green(name);
  if (ARCHIVE_EXTENSIONS.has(ext)) return chalk.yellow(name);

  // Directories typically have no extension
  if (!ext) return chalk.blue(name);

  return name;
}

export async function ls(path: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();

  const files = ftpList(host, path, resolveTimeout(opts));

  if (files === null) {
    printError(
      `Cannot list ${path} on ${host}`,
      [
        "The device is not responding or the path does not exist.",
        "",
        "Try:",
        "  c64 ls /              List the root directory",
        `  c64 discover          Check device connectivity`,
      ].join("\n"),
    );
    process.exit(3);
  }

  if (opts["json"]) {
    printData(files, opts);
    return;
  }

  if (files.length === 0) {
    printInfo(`${path}: empty directory`, opts);
    return;
  }

  for (const file of files) {
    console.log(`  ${colorizeFilename(file, opts)}`);
  }
}
