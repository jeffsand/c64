#!/usr/bin/env node

/**
 * c64 -- Command your C64 Ultimate from the terminal.
 *
 * A CLI tool for controlling C64 Ultimate devices over the local network.
 * Supports the REST API (port 80) and TCP binary protocol (port 64).
 */

import { createCli } from "./cli.js";
import { C64Error, EXIT } from "./error.js";
import { printError } from "./output.js";

const program = createCli();

// Global error handler -- catch C64Error and display helpful messages
program.exitOverride();

try {
  await program.parseAsync();
} catch (err: unknown) {
  if (err instanceof C64Error) {
    printError(err.message, err.help);
    process.exit(err.exitCode);
  }

  // Commander errors (missing args, unknown commands) handle themselves
  const e = err as { code?: string; exitCode?: number };
  if (e.code?.startsWith("commander.")) {
    process.exit(e.exitCode ?? 1);
  }

  // Unexpected errors
  printError(String((err as Error).message ?? err));
  process.exit(EXIT.GENERAL);
}
