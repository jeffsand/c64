/**
 * Background update checker.
 *
 * Checks npm registry for a newer version at most once every 24 hours.
 * The check runs in a detached child process so it never delays the CLI.
 * Results are cached to ~/.config/c64/update-check.json and displayed
 * on the next run.
 *
 * Design:
 * - Never blocks the main process
 * - Never throws (all errors silently ignored)
 * - Never pollutes stdout (stderr only)
 * - Respects --quiet and CI environments
 * - Cache file is optional -- missing or corrupt is fine
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { configDir } from "./config.js";
import { version } from "./version.js";

const PACKAGE_NAME = "@jeffsand/c64";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UpdateCache {
  latest: string;
  current: string;
  checked: string;
}

function cachePath(): string {
  return join(configDir(), "update-check.json");
}

/**
 * Read the cached update check result.
 * Returns null if no cache, cache is stale, or cache is unreadable.
 */
function readCache(): UpdateCache | null {
  try {
    const path = cachePath();
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as UpdateCache;
  } catch {
    return null;
  }
}

/**
 * Display an update notice if a newer version is available.
 * Call this early in the CLI lifecycle. It only reads a local cache file
 * (no network, no delay). Prints to stderr.
 */
export function notifyIfUpdateAvailable(opts: Record<string, unknown>): void {
  // Skip in quiet mode
  if (opts["quiet"]) return;

  // Skip in CI environments
  if (process.env["CI"] || process.env["CONTINUOUS_INTEGRATION"]) return;

  try {
    const cache = readCache();
    if (!cache) return;

    // Only notify if the cached latest is newer than current
    if (cache.latest === version) return;
    if (!isNewer(cache.latest, version)) return;

    console.error(`Update available: ${version} -> ${cache.latest}`);
    console.error(`Run: npm install -g ${PACKAGE_NAME}`);
    console.error("");
  } catch {
    // Never let update checks break the CLI
  }
}

/**
 * Spawn a background process to check for updates.
 * Call this after the main command completes. The child process is detached
 * and unref'd so it does not keep the parent alive.
 */
export function scheduleUpdateCheck(): void {
  // Skip in CI
  if (process.env["CI"] || process.env["CONTINUOUS_INTEGRATION"]) return;

  // Check if we already checked recently
  try {
    const cache = readCache();
    if (cache) {
      const elapsed = Date.now() - new Date(cache.checked).getTime();
      if (elapsed < CHECK_INTERVAL_MS) return;
    }
  } catch {
    // Proceed with check if cache is unreadable
  }

  // Spawn background checker as a detached child
  try {
    const checkerPath = fileURLToPath(new URL("./update-worker.js", import.meta.url));
    const child = fork(checkerPath, [], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Silently ignore -- never let this break anything
  }
}

/**
 * Compare semver strings. Returns true if a is newer than b.
 */
function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}
