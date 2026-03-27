/**
 * c64 config -- Manage configuration.
 */

import { createInterface } from "node:readline";
import { loadConfig, saveConfig, configPath, type Config } from "../config.js";
import { printData, printSuccess, printError, printInfo } from "../output.js";

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

/**
 * Prompt the user for a line of input.
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive first-time setup.
 *
 * With --no-input, creates a default config without prompting.
 * Otherwise, asks the user for the device host.
 */
export async function configInit(opts: Record<string, unknown>): Promise<void> {
  const config = loadConfig();

  if (opts["input"] === false) {
    // --no-input: just create default config
    saveConfig(config);
    printSuccess(`Config created at ${configPath()}`, opts);
    if (opts["json"]) {
      printData(config, opts);
    }
    return;
  }

  // Interactive setup
  printInfo("C64 Ultimate CLI -- first-time setup", opts);
  printInfo("", opts);

  const hostAnswer = await prompt(
    `Device IP address${config.device.host ? ` [${config.device.host}]` : ""} (or run 'c64 discover'): `
  );

  if (hostAnswer) {
    config.device.host = hostAnswer;
  }

  const timeoutAnswer = await prompt(
    `Connection timeout in seconds [${config.device.timeout}]: `
  );
  if (timeoutAnswer) {
    const num = parseInt(timeoutAnswer, 10);
    if (!isNaN(num) && num > 0) {
      config.device.timeout = num;
    }
  }

  const driveAnswer = await prompt(
    `Default drive letter (a/b) [${config.defaults.drive}]: `
  );
  if (driveAnswer === "a" || driveAnswer === "b") {
    config.defaults.drive = driveAnswer;
  }

  saveConfig(config);
  printSuccess(`Config saved to ${configPath()}`, opts);

  if (opts["json"]) {
    printData(config, opts);
  } else {
    printInfo("", opts);
    console.log(JSON.stringify(config, null, 2));
  }
}
