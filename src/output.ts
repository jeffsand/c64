/**
 * Output formatting utilities.
 *
 * Handles TTY detection, JSON vs pretty output, and colored messages.
 * All user-facing output goes through these helpers to ensure:
 * - Data goes to stdout, messages go to stderr
 * - --json flag produces stable, parseable output
 * - --quiet suppresses informational messages
 * - Colors are disabled when piped or --no-color is set
 */

import chalk from "chalk";

export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
}

/** Whether stdout is a TTY (human at terminal vs piped). */
export const isTTY = process.stdout.isTTY === true;

/** Print structured data to stdout. Respects --json flag. */
export function printData(data: unknown, opts: OutputOptions): void {
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    // Pretty-print for humans
    if (typeof data === "string") {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/** Print an informational message to stderr. Suppressed by --quiet. */
export function printInfo(message: string, opts: OutputOptions): void {
  if (opts.quiet) return;
  console.error(message);
}

/** Print a success message to stderr. */
export function printSuccess(message: string, opts: OutputOptions): void {
  if (opts.quiet) return;
  const prefix = opts.color !== false ? chalk.green("OK") : "OK";
  console.error(`${prefix} ${message}`);
}

/** Print an error message to stderr with guidance. */
export function printError(message: string, help?: string): void {
  console.error(`${chalk.red("Error:")} ${message}`);
  if (help) {
    console.error("");
    console.error(help);
  }
}

/**
 * Print a key-value table to stdout for human-readable output.
 * Falls back to JSON when --json is set.
 */
export function printTable(
  rows: Array<{ label: string; value: string }>,
  opts: OutputOptions,
): void {
  if (opts.json) {
    const obj: Record<string, string> = {};
    for (const row of rows) {
      obj[row.label] = row.value;
    }
    console.log(JSON.stringify(obj, null, 2));
    return;
  }

  const maxLabel = Math.max(...rows.map((r) => r.label.length));
  for (const row of rows) {
    const label = chalk.bold(row.label.padEnd(maxLabel));
    console.log(`  ${label}  ${row.value}`);
  }
}
