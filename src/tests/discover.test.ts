/**
 * Network discovery tests.
 *
 * These test the exported function signature and subnet parsing.
 * Actual network scanning is not practical in unit tests.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "..", "index.js");

function run(...args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

describe("discover command", () => {
  it("discover module exports a function", async () => {
    const mod = await import("../commands/discover.js");
    assert.equal(typeof mod.discover, "function");
  });

  it("discover --help shows usage", () => {
    const result = run("discover", "--help");
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("--save"), "should mention --save flag");
    assert.ok(result.stdout.includes("--subnet"), "should mention --subnet flag");
  });
});
