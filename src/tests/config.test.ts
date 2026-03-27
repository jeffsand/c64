/**
 * Config module unit tests.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test the config logic by setting XDG_CONFIG_HOME to a temp dir
describe("Config", () => {
  let tempDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "c64-test-"));
    originalXdg = process.env["XDG_CONFIG_HOME"];
    process.env["XDG_CONFIG_HOME"] = tempDir;
  });

  afterEach(() => {
    if (originalXdg !== undefined) {
      process.env["XDG_CONFIG_HOME"] = originalXdg;
    } else {
      delete process.env["XDG_CONFIG_HOME"];
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loadConfig returns defaults when no file exists", async () => {
    const { loadConfig } = await import("../config.js");
    const config = loadConfig();
    assert.equal(config.device.host, "");
    assert.equal(config.device.timeout, 10);
    assert.equal(config.defaults.drive, "a");
  });

  it("saveConfig creates the config directory", async () => {
    const { saveConfig, configPath } = await import("../config.js");
    saveConfig({
      device: { host: "192.168.1.119", timeout: 15 },
      defaults: { drive: "b" },
    });
    assert.ok(existsSync(configPath()));
  });

  it("round-trips config through save and load", async () => {
    const { saveConfig, loadConfig } = await import("../config.js");
    const original = {
      device: { host: "10.0.0.5", timeout: 20 },
      defaults: { drive: "b" as const },
    };
    saveConfig(original);
    const loaded = loadConfig();
    assert.equal(loaded.device.host, "10.0.0.5");
    assert.equal(loaded.device.timeout, 20);
    assert.equal(loaded.defaults.drive, "b");
  });
});
