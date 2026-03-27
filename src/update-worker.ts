/**
 * Background update worker.
 *
 * This runs as a detached child process. It checks the npm registry
 * for the latest version and writes the result to the cache file.
 * Exits silently on any error.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { version } from "./version.js";

const PACKAGE_NAME = "@jeffsand/c64";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

function configDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg ?? join(homedir(), ".config");
  return join(base, "c64");
}

async function main(): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(REGISTRY_URL, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });

    clearTimeout(timer);

    if (!response.ok) return;

    const data = await response.json() as { version?: string };
    const latest = data.version;
    if (!latest) return;

    // Write cache
    const dir = configDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const cache = {
      latest,
      current: version,
      checked: new Date().toISOString(),
    };

    writeFileSync(
      join(dir, "update-check.json"),
      JSON.stringify(cache, null, 2) + "\n",
    );
  } catch {
    // Exit silently on any error
  }
}

main();
