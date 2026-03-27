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
import { notifyIfUpdateAvailable, scheduleUpdateCheck } from "./update-check.js";

// Schedule background update check early (fire-and-forget, never blocks)
scheduleUpdateCheck();

// Show update notice if a newer version was found on a previous run
notifyIfUpdateAvailable({});

const program = createCli();
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
