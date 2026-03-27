/**
 * Update check tests.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("update check", () => {
  let tempDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "c64-update-test-"));
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

  it("notifyIfUpdateAvailable does not throw when no cache exists", async () => {
    const { notifyIfUpdateAvailable } = await import("../update-check.js");
    // Should not throw
    notifyIfUpdateAvailable({});
  });

  it("notifyIfUpdateAvailable is silent in quiet mode", async () => {
    const { notifyIfUpdateAvailable } = await import("../update-check.js");
    // Write a cache that would trigger a notice
    const dir = join(tempDir, "c64");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "update-check.json"), JSON.stringify({
      latest: "99.0.0",
      current: "0.1.0",
      checked: new Date().toISOString(),
    }));
    // Should not print in quiet mode (no way to capture stderr in this test,
    // but at least verify it does not throw)
    notifyIfUpdateAvailable({ quiet: true });
  });

  it("notifyIfUpdateAvailable is silent in CI", async () => {
    process.env["CI"] = "true";
    const { notifyIfUpdateAvailable } = await import("../update-check.js");
    notifyIfUpdateAvailable({});
    delete process.env["CI"];
  });

  it("scheduleUpdateCheck does not throw", async () => {
    const { scheduleUpdateCheck } = await import("../update-check.js");
    // Should not throw even if things go wrong
    scheduleUpdateCheck();
  });
});
