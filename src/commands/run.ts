/**
 * c64 run -- Auto-detect file type and run.
 */
import { UltimateClient } from "../api/rest.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError, UnsupportedFormatError } from "../error.js";
import { printSuccess, printError, printInfo } from "../output.js";

export async function run(file: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  const client = new UltimateClient(host, resolveTimeout(opts));
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  try {
    switch (ext) {
      case "crt":
        printInfo(`Running cartridge: ${file}`, opts);
        await client.runCrt(file);
        break;
      case "prg":
        printInfo(`Running PRG: ${file}`, opts);
        await client.runPrg(file);
        break;
      case "d64":
      case "g64":
      case "t64":
        printInfo(`Mounting and loading: ${file}`, opts);
        await client.mount("a", file);
        break;
      default:
        throw new UnsupportedFormatError(file);
    }
    printSuccess(`Running ${file}`, opts);
  } catch (err: unknown) {
    if (err instanceof UnsupportedFormatError) {
      printError(err.message, err.help);
      process.exit(err.exitCode);
    }
    printError(`Failed to run: ${(err as Error).message}`);
    process.exit(3);
  }
}
