/**
 * Smart input resolution tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { resolve, isPlayable } from "../resolve.js";
import { UnsupportedFormatError } from "../error.js";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures");
const TEST_D64 = join(FIXTURES, "test.d64");

describe("isPlayable", () => {
  it("recognizes .d64 files", () => {
    assert.ok(isPlayable("game.d64"));
  });

  it("recognizes .crt files", () => {
    assert.ok(isPlayable("game.crt"));
  });

  it("recognizes .prg files", () => {
    assert.ok(isPlayable("game.prg"));
  });

  it("rejects .txt files", () => {
    assert.ok(!isPlayable("readme.txt"));
  });

  it("rejects .mp3 files", () => {
    assert.ok(!isPlayable("music.mp3"));
  });
});

describe("resolve", () => {
  it("resolves a .d64 file directly", async () => {
    const result = await resolve(TEST_D64);
    assert.equal(result.path, TEST_D64);
    assert.equal(result.originalName, "test.d64");
    assert.equal(result.cleanup, false);
  });

  it("resolves a .crt path directly", async () => {
    const result = await resolve("/SD/games/ocean.crt");
    assert.equal(result.path, "/SD/games/ocean.crt");
    assert.equal(result.cleanup, false);
  });

  it("resolves a .prg path directly", async () => {
    const result = await resolve("hello.prg");
    assert.equal(result.path, "hello.prg");
    assert.equal(result.cleanup, false);
  });

  it("extracts a D64 from a zip archive", async () => {
    // Programmatically create a zip containing the test D64
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addLocalFile(TEST_D64);

    const tempDir = mkdtempSync(join(tmpdir(), "c64-test-zip-"));
    const zipPath = join(tempDir, "game.zip");
    zip.writeZip(zipPath);

    try {
      const result = await resolve(zipPath);
      assert.ok(result.path.endsWith("test.d64"), `Expected path ending with test.d64, got ${result.path}`);
      assert.equal(result.originalName, "test.d64");
      assert.equal(result.cleanup, true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves a directory with Disk1.d64", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "c64-test-dir-"));
    const gameDir = join(tempDir, "mygame");
    mkdirSync(gameDir);
    copyFileSync(TEST_D64, join(gameDir, "Disk1.d64"));

    try {
      const result = await resolve(gameDir);
      assert.ok(result.path.endsWith("Disk1.d64"));
      assert.equal(result.originalName, "Disk1.d64");
      assert.equal(result.cleanup, false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves a directory with a playable file", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "c64-test-dir2-"));
    const gameDir = join(tempDir, "mygame");
    mkdirSync(gameDir);
    copyFileSync(TEST_D64, join(gameDir, "game.d64"));

    try {
      const result = await resolve(gameDir);
      assert.ok(result.path.endsWith("game.d64"));
      assert.equal(result.originalName, "game.d64");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("detects URLs without downloading", async () => {
    // We verify URL detection by checking that resolve() attempts a fetch
    // (which will fail since the URL is fake). The important thing is that
    // it does not throw UnsupportedFormatError -- it throws a network error.
    try {
      await resolve("https://example.invalid/game.d64");
      assert.fail("Should have thrown");
    } catch (err: unknown) {
      // Should be a network/fetch error, not UnsupportedFormatError
      assert.ok(!(err instanceof UnsupportedFormatError),
        "URL should be detected as URL, not rejected as unsupported format");
    }
  });

  it("throws UnsupportedFormatError for unsupported files", async () => {
    try {
      await resolve("readme.txt");
      assert.fail("Should have thrown UnsupportedFormatError");
    } catch (err: unknown) {
      assert.ok(err instanceof UnsupportedFormatError);
    }
  });

  it("throws for empty directory with no playable files", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "c64-test-empty-"));
    const emptyDir = join(tempDir, "empty");
    mkdirSync(emptyDir);

    try {
      await resolve(emptyDir);
      assert.fail("Should have thrown");
    } catch (err: unknown) {
      assert.ok(err instanceof UnsupportedFormatError);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
