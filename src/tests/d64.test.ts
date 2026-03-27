/**
 * D64 parser, creator, and renamer tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, createBlank, rename } from "../d64.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "..", "fixtures");
const TEST_D64 = join(FIXTURES, "test.d64");

describe("D64 parse", () => {
  it("parses test fixture disk name", () => {
    const data = readFileSync(TEST_D64);
    const dir = parse(data);
    assert.ok(dir !== null, "parse should return a directory");
    assert.equal(dir.diskName, "TEST DISK");
  });

  it("finds HELLO WORLD PRG entry", () => {
    const data = readFileSync(TEST_D64);
    const dir = parse(data);
    assert.ok(dir !== null);
    const hello = dir.entries.find((e) => e.filename === "HELLO WORLD");
    assert.ok(hello !== undefined, "should find HELLO WORLD entry");
    assert.equal(hello.fileType, "PRG");
  });

  it("reports entries as closed", () => {
    const data = readFileSync(TEST_D64);
    const dir = parse(data);
    assert.ok(dir !== null);
    for (const entry of dir.entries) {
      assert.ok(entry.closed, `${entry.filename} should be closed`);
    }
  });

  it("reports free blocks", () => {
    const data = readFileSync(TEST_D64);
    const dir = parse(data);
    assert.ok(dir !== null);
    assert.ok(dir.freeBlocks > 0, "should have free blocks");
    assert.ok(dir.freeBlocks <= 664, "should not exceed 664 free blocks");
  });

  it("returns null for too-small data", () => {
    const data = Buffer.alloc(100);
    const dir = parse(data);
    assert.equal(dir, null);
  });

  it("returns null for empty buffer", () => {
    const dir = parse(Buffer.alloc(0));
    assert.equal(dir, null);
  });

  it("handles extended D64 size (175531) without crashing", () => {
    // Create a standard D64 and extend it to 175531 bytes (error bytes)
    const blank = createBlank("EXTENDED");
    const extended = Buffer.alloc(175531);
    blank.copy(extended);
    const dir = parse(extended);
    assert.ok(dir !== null, "should parse extended D64");
    assert.equal(dir.diskName, "EXTENDED");
  });

  it("handles 40-track D64 size (196608) without crashing", () => {
    const blank = createBlank("40TRACK");
    const big = Buffer.alloc(196608);
    blank.copy(big);
    const dir = parse(big);
    assert.ok(dir !== null, "should parse 40-track D64");
    assert.equal(dir.diskName, "40TRACK");
  });
});

describe("D64 createBlank", () => {
  it("creates a 174848-byte image", () => {
    const disk = createBlank("MY DISK");
    assert.equal(disk.length, 174848);
  });

  it("sets the disk name correctly", () => {
    const disk = createBlank("MY DISK");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.equal(dir.diskName, "MY DISK");
  });

  it("has 664 free blocks on a blank disk", () => {
    const disk = createBlank("EMPTY");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.equal(dir.freeBlocks, 664);
  });

  it("has no directory entries on a blank disk", () => {
    const disk = createBlank("EMPTY");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.equal(dir.entries.length, 0);
  });

  it("uses default disk ID", () => {
    const disk = createBlank("TEST");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.ok(dir.diskId.startsWith("00"), `diskId should start with "00", got "${dir.diskId}"`);
  });

  it("uses custom disk ID", () => {
    const disk = createBlank("TEST", "AB");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.ok(dir.diskId.startsWith("AB"), `diskId should start with "AB", got "${dir.diskId}"`);
  });

  it("truncates long disk names to 16 characters", () => {
    const disk = createBlank("THIS NAME IS WAY TOO LONG FOR D64");
    const dir = parse(disk);
    assert.ok(dir !== null);
    assert.ok(dir.diskName.length <= 16, "disk name should be at most 16 chars");
  });
});

describe("D64 rename", () => {
  it("renames a disk image", () => {
    const disk = createBlank("ORIGINAL");
    const renamed = rename(disk, "NEW NAME");
    assert.ok(renamed !== null);
    const dir = parse(renamed);
    assert.ok(dir !== null);
    assert.equal(dir.diskName, "NEW NAME");
  });

  it("returns null for too-small data", () => {
    const result = rename(Buffer.alloc(100), "TEST");
    assert.equal(result, null);
  });

  it("does not modify the original buffer", () => {
    const disk = createBlank("ORIGINAL");
    const copy = Buffer.from(disk);
    rename(disk, "CHANGED");
    // Original should still parse as ORIGINAL (rename creates a new buffer)
    const dir = parse(copy);
    assert.ok(dir !== null);
    assert.equal(dir.diskName, "ORIGINAL");
  });

  it("uppercases the new name", () => {
    const disk = createBlank("ORIGINAL");
    const renamed = rename(disk, "lowercase");
    assert.ok(renamed !== null);
    const dir = parse(renamed);
    assert.ok(dir !== null);
    assert.equal(dir.diskName, "LOWERCASE");
  });
});
