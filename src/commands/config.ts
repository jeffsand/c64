/**
 * c64 config -- Manage configuration.
 */

import { loadConfig, saveConfig, configPath, type Config } from "../config.js";
import { printData, printSuccess, printError } from "../output.js";

/** Show current configuration. */
export async function configShow(opts: Record<string, unknown>): Promise<void> {
  const config = loadConfig();
  const path = configPath();

  if (opts["json"]) {
    printData({ ...config, _path: path }, opts);
    return;
  }

  console.log(`Config file: ${path}`);
  console.log("");
  console.log(JSON.stringify(config, null, 2));
}

/** Set a configuration value. */
export async function configSet(
  key: string,
  value: string,
  opts: Record<string, unknown>,
): Promise<void> {
  const config = loadConfig();

  const parts = key.split(".");
  if (parts.length !== 2) {
    printError(
      `Invalid key: ${key}`,
      "Use dotted notation: device.host, device.timeout, defaults.drive",
    );
    process.exit(2);
  }

  const [section, field] = parts as [string, string];

  // Type-safe config updates
  if (section === "device" && field === "host") {
    config.device.host = value;
  } else if (section === "device" && field === "timeout") {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      printError("Timeout must be a positive number.");
      process.exit(2);
    }
    config.device.timeout = num;
  } else if (section === "defaults" && field === "drive") {
    if (value !== "a" && value !== "b") {
      printError('Drive must be "a" or "b".');
      process.exit(2);
    }
    config.defaults.drive = value;
  } else {
    printError(
      `Unknown config key: ${key}`,
      "Valid keys: device.host, device.timeout, defaults.drive",
    );
    process.exit(2);
  }

  saveConfig(config);
  printSuccess(`Set ${key} = ${value}`, opts);
}

/** Interactive first-time setup. */
export async function configInit(opts: Record<string, unknown>): Promise<void> {
  console.error("Not yet implemented. Coming in Phase 7 (with discover).");
}
