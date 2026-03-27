/**
 * c64 type -- Type text on the C64 keyboard.
 */
import { tcpType } from "../api/socket.js";
import { resolveHost, resolveTimeout } from "../config.js";
import { NoHostConfiguredError } from "../error.js";
import { printSuccess, printError } from "../output.js";

export async function typeText(text: string, opts: Record<string, unknown>): Promise<void> {
  const host = resolveHost(opts);
  if (!host) throw new NoHostConfiguredError();
  try {
    await tcpType(host, text, resolveTimeout(opts));
    printSuccess(`Typed ${text.length} characters`, opts);
  } catch (err: unknown) {
    printError(`Failed to type: ${(err as Error).message}`);
    process.exit(3);
  }
}
