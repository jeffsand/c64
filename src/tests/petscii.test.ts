/**
 * PETSCII encoding/decoding tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { petsciiEncode, petsciiDecode } from "../api/petscii.js";

describe("PETSCII encode", () => {
  it("encodes uppercase letters", () => {
    const result = petsciiEncode("ABC");
    assert.deepEqual([...result], [0x41, 0x42, 0x43]);
  });

  it("converts lowercase to uppercase", () => {
    const result = petsciiEncode("abc");
    assert.deepEqual([...result], [0x41, 0x42, 0x43]);
  });

  it("encodes digits", () => {
    const result = petsciiEncode("123");
    assert.deepEqual([...result], [0x31, 0x32, 0x33]);
  });

  it("encodes space", () => {
    const result = petsciiEncode(" ");
    assert.deepEqual([...result], [0x20]);
  });

  it("encodes backslash-r as RETURN", () => {
    const result = petsciiEncode("A\\r");
    assert.deepEqual([...result], [0x41, 0x0d]);
  });

  it("encodes real newline as RETURN", () => {
    const result = petsciiEncode("A\r");
    assert.deepEqual([...result], [0x41, 0x0d]);
  });

  it("encodes quotes and common punctuation", () => {
    const result = petsciiEncode('"*,');
    assert.deepEqual([...result], [0x22, 0x2a, 0x2c]);
  });

  it("encodes LOAD command correctly", () => {
    const result = petsciiEncode('LOAD"*",8,1\\r');
    // L=0x4C O=0x4F A=0x41 D=0x44 "=0x22 *=0x2A "=0x22 ,=0x2C 8=0x38 ,=0x2C 1=0x31 CR=0x0D
    assert.deepEqual([...result], [
      0x4c, 0x4f, 0x41, 0x44, 0x22, 0x2a, 0x22, 0x2c, 0x38, 0x2c, 0x31, 0x0d,
    ]);
  });
});

describe("PETSCII decode", () => {
  it("decodes uppercase letters", () => {
    const result = petsciiDecode(Buffer.from([0x41, 0x42, 0x43]));
    assert.equal(result, "ABC");
  });

  it("stops at 0xA0 padding", () => {
    const result = petsciiDecode(Buffer.from([0x41, 0x42, 0xa0, 0xa0]));
    assert.equal(result, "AB");
  });

  it("decodes shifted uppercase", () => {
    const result = petsciiDecode(Buffer.from([0xc1, 0xc2, 0xc3]));
    assert.equal(result, "ABC");
  });

  it("handles empty buffer", () => {
    const result = petsciiDecode(Buffer.alloc(0));
    assert.equal(result, "");
  });
});
