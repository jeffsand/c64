/**
 * c64 run -- Auto-detect file type and run (CRT/PRG/D64).
 *
 * Supports direct paths, URLs, zip archives, and directories.
 * Resolves the input first, then dispatches to the appropriate API call.
 */
import { extname } from "node:path";
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, UnsupportedFormatError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";
import { resolve } from "../resolve.js";

export async function run(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const client = new UltimateClient(host, resolveTimeout(opts));

  try {
    const resolved = await resolve(file);

    if (resolved.cleanup) {
      printInfo("Note: upload not yet implemented -- resolved file is local only.", opts);
    }

    const ext = extname(resolved.path).toLowerCase().replace(".", "");
    switch (ext) {
      case "crt":
        printInfo(`Running cartridge: ${resolved.originalName}`, opts);
        await client.runCrt(resolved.path);
        break;
      case "prg":
        printInfo(`Running PRG: ${resolved.originalName}`, opts);
        await client.runPrg(resolved.path);
        break;
      case "d64":
      case "g64":
      case "t64":
        printInfo(`Mounting and loading: ${resolved.originalName}`, opts);
        await client.mount("a", resolved.path);
        break;
      default:
        throw new UnsupportedFormatError(resolved.originalName);
    }
    printSuccess(`Running ${resolved.originalName}`, opts);
  } catch (err: unknown) {
    if (err instanceof UnsupportedFormatError) {
      printError(err.message, err.help);
      process.exit(err.exitCode);
    }
    printError(`Failed to run: ${(err as Error).message}`);
    process.exit(3);
  }
}
