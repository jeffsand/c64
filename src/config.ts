/**
 * Configuration file management.
 *
 * Config lives at ~/.config/c64/config.json (XDG-compatible).
 * Precedence: CLI flag > environment variable > config file > default.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** The shape of the config file. */
export interface Config {
  device: {
    host: string;
    timeout: number;
  };
  defaults: {
    drive: "a" | "b";
  };
}

const DEFAULT_CONFIG: Config = {
  device: {
    host: "",
    timeout: 10,
  },
  defaults: {
    drive: "a",
  },
};

/** Returns the config directory path (~/.config/c64/). */
export function configDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg ?? join(homedir(), ".config");
  return join(base, "c64");
}

/** Returns the config file path. */
export function configPath(): string {
  return join(configDir(), "config.json");
}

/** Load config from disk. Returns defaults if file does not exist. */
export function loadConfig(): Config {
  const path = configPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      device: {
        host: parsed.device?.host ?? DEFAULT_CONFIG.device.host,
        timeout: parsed.device?.timeout ?? DEFAULT_CONFIG.device.timeout,
      },
      defaults: {
        drive: parsed.defaults?.drive ?? DEFAULT_CONFIG.defaults.drive,
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Save config to disk. Creates the directory if needed. */
export function saveConfig(config: Config): void {
  const dir = configDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
}

/**
 * Resolve the device host from all sources (precedence order).
 * Returns the host string, or empty string if none configured.
 */
export function resolveHost(opts: Record<string, unknown>): string {
  // 1. CLI flag (highest priority)
  if (typeof opts["host"] === "string" && opts["host"]) {
    return opts["host"];
  }

  // 2. Environment variable (handled by Commander env option, but check directly too)
  const envHost = process.env["C64_HOST"];
  if (envHost) {
    return envHost;
  }

  // 3. Config file
  const config = loadConfig();
  if (config.device.host) {
    return config.device.host;
  }

  // 4. No host configured
  return "";
}

/**
 * Resolve the connection timeout from all sources.
 */
export function resolveTimeout(opts: Record<string, unknown>): number {
  if (typeof opts["timeout"] === "string") {
    const parsed = parseInt(opts["timeout"], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed * 1000;
  }

  const config = loadConfig();
  return config.device.timeout * 1000;
}
