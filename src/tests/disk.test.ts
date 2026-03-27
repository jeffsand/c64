/**
 * Data disk management tests.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("disk commands", () => {
  let tempDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "c64-disk-test-"));
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

  it("diskList returns empty when no disks exist", async () => {
    const { diskList } = await import("../commands/disk.js");
    // Should not throw
    await diskList({ json: true, quiet: true });
  });

  it("diskCreate creates a D64 file and updates manifest", async () => {
    const { diskCreate } = await import("../commands/disk.js");
    await diskCreate({ name: "TEST-01", json: false, quiet: true });

    const manifestPath = join(tempDir, "c64", "disks", "manifest.json");
    assert.ok(existsSync(manifestPath), "manifest should exist");

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    assert.equal(manifest.disks.length, 1);
    assert.equal(manifest.disks[0].name, "TEST-01");
    assert.equal(manifest.disks[0].id, 1);

    const d64Path = join(tempDir, "c64", "disks", manifest.disks[0].filename);
    assert.ok(existsSync(d64Path), "D64 file should exist");

    const d64Data = readFileSync(d64Path);
    assert.equal(d64Data.length, 174848, "D64 should be 174848 bytes");
  });

  it("diskCreate auto-generates name when none given", async () => {
    const { diskCreate } = await import("../commands/disk.js");
    await diskCreate({ json: false, quiet: true });

    const manifestPath = join(tempDir, "c64", "disks", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    assert.equal(manifest.disks[0].name, "SAVE-01");
  });

  it("diskCreate increments IDs", async () => {
    const { diskCreate } = await import("../commands/disk.js");
    await diskCreate({ name: "DISK-A", json: false, quiet: true });
    await diskCreate({ name: "DISK-B", json: false, quiet: true });

    const manifestPath = join(tempDir, "c64", "disks", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    assert.equal(manifest.disks.length, 2);
    assert.equal(manifest.disks[0].id, 1);
    assert.equal(manifest.disks[1].id, 2);
  });

  it("diskDir parses a created disk", async () => {
    const { diskCreate, diskDir } = await import("../commands/disk.js");
    await diskCreate({ name: "PARSEME", json: false, quiet: true });
    // Should not throw
    await diskDir("1", { json: true, quiet: true });
  });
});
