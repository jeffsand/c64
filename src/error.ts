/**
 * Error types with helpful messages.
 *
 * Every error has three parts:
 * 1. What happened
 * 2. Why it likely happened
 * 3. What to do about it
 */

/** Exit codes for different error categories. */
export const EXIT = {
  SUCCESS: 0,
  GENERAL: 1,
  USAGE: 2,
  DEVICE: 3,
  NETWORK: 4,
} as const;

/** Base error class with help text and exit code. */
export class C64Error extends Error {
  readonly help: string;
  readonly exitCode: number;

  constructor(message: string, help: string, exitCode: number = EXIT.GENERAL) {
    super(message);
    this.name = "C64Error";
    this.help = help;
    this.exitCode = exitCode;
  }
}

/** Device is not reachable on the network. */
export class DeviceUnreachableError extends C64Error {
  constructor(host: string) {
    super(
      `Cannot connect to C64 Ultimate at ${host}`,
      [
        "The device is not responding. This usually means:",
        "  - The device is powered off or not on the network",
        "  - The IP address is wrong",
        "",
        "Try:",
        "  c64 discover              Scan for the device",
        "  c64 config set device.host <IP>  Set a different IP",
      ].join("\n"),
      EXIT.DEVICE,
    );
  }
}

/** No device host configured anywhere. */
export class NoHostConfiguredError extends C64Error {
  constructor() {
    super(
      "No device configured",
      [
        "Set up your C64 Ultimate connection:",
        "",
        "  c64 discover --save       Auto-find and save",
        "  c64 config set device.host 192.168.1.119",
        "  c64 --host 192.168.1.119 info",
        "  C64_HOST=192.168.1.119 c64 info",
      ].join("\n"),
      EXIT.DEVICE,
    );
  }
}

/** File not found on the device storage. */
export class FileNotFoundError extends C64Error {
  constructor(path: string) {
    const parent = path.split("/").slice(0, -1).join("/") || "/";
    super(
      `File not found on device: ${path}`,
      [
        `Run 'c64 ls ${parent}' to see available files.`,
        "To upload a local file: c64 upload <file>",
      ].join("\n"),
      EXIT.DEVICE,
    );
  }
}

/** Unsupported file format. */
export class UnsupportedFormatError extends C64Error {
  constructor(filename: string) {
    const ext = filename.split(".").pop() ?? "unknown";
    super(
      `Unsupported file format: .${ext}`,
      [
        "Supported formats: .d64, .g64, .t64, .crt, .prg, .sid, .tap",
        "ZIP archives containing supported formats are also accepted.",
      ].join("\n"),
      EXIT.USAGE,
    );
  }
}
