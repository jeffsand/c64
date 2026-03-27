/**
 * CLI integration tests.
 *
 * These run the actual CLI binary and check stdout/stderr/exit codes.
 */

import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
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

describe("c64 CLI", () => {
  it("--version prints version number", () => {
    const result = run("--version");
    assert.equal(result.code, 0);
    assert.match(result.stdout, /\d+\.\d+\.\d+/);
  });

  it("-V also prints version", () => {
    const result = run("-V");
    assert.equal(result.code, 0);
    assert.match(result.stdout, /\d+\.\d+\.\d+/);
  });

  it("--help lists all commands", () => {
    const result = run("--help");
    assert.equal(result.code, 0);
    const out = result.stdout;
    assert.ok(out.includes("info"), "should list info command");
    assert.ok(out.includes("mount"), "should list mount command");
    assert.ok(out.includes("play"), "should list play command");
    assert.ok(out.includes("type"), "should list type command");
    assert.ok(out.includes("discover"), "should list discover command");
    assert.ok(out.includes("disk"), "should list disk command");
    assert.ok(out.includes("config"), "should list config command");
    assert.ok(out.includes("watch"), "should list watch command");
    assert.ok(out.includes("completions"), "should list completions command");
  });

  it("info --help shows info-specific help with examples", () => {
    const result = run("info", "--help");
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("Examples:"));
    assert.ok(result.stdout.includes("--json"));
  });

  it("mount without arguments shows help", () => {
    const result = run("mount");
    // Commander exits with code 1 when required arg is missing
    assert.notEqual(result.code, 0);
  });

  it("unknown command exits non-zero", () => {
    const result = run("nonexistent");
    assert.notEqual(result.code, 0);
  });

  it("--json flag is accepted globally", () => {
    const result = run("--json", "--help");
    assert.equal(result.code, 0);
  });

  it("--quiet flag is accepted globally", () => {
    const result = run("--quiet", "--help");
    assert.equal(result.code, 0);
  });
});

describe("c64 completions", () => {
  it("completions bash outputs a bash script", () => {
    const result = run("completions", "bash");
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("_c64_completions"), "should define bash completion function");
    assert.ok(result.stdout.includes("complete -F"), "should register completion");
  });

  it("completions zsh outputs a zsh script", () => {
    const result = run("completions", "zsh");
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("#compdef c64"), "should have compdef header");
    assert.ok(result.stdout.includes("_describe"), "should use _describe");
  });

  it("completions fish outputs a fish script", () => {
    const result = run("completions", "fish");
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("complete -c c64"), "should define fish completions");
  });

  it("completions with unsupported shell exits non-zero", () => {
    const result = run("completions", "powershell");
    assert.notEqual(result.code, 0);
  });

  it("completions without argument exits non-zero", () => {
    const result = run("completions");
    assert.notEqual(result.code, 0);
  });
});

describe("c64 config", () => {
  it("config show works", () => {
    const result = run("config", "show");
    assert.equal(result.code, 0);
  });

  it("config set validates key format", () => {
    const result = run("config", "set", "badkey", "value");
    assert.notEqual(result.code, 0);
  });

  it("config set validates drive values", () => {
    const result = run("config", "set", "defaults.drive", "c");
    assert.notEqual(result.code, 0);
  });
});
