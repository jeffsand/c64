/**
 * CLI definition using Commander.js.
 *
 * Every command is defined here with its arguments, options, and help text.
 * Command handlers live in src/commands/ -- one file per command.
 */

import { Command, Option } from "commander";
import { version } from "./version.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("c64")
    .description("Command your C64 Ultimate from the terminal.")
    .version(version, "-V, --version", "Show version number")
    .addOption(
      new Option("--host <ip>", "Device IP address")
        .env("C64_HOST")
    )
    .addOption(
      new Option("--json", "Output as JSON (for scripting and agents)")
    )
    .addOption(
      new Option("-q, --quiet", "Suppress informational output")
    )
    .addOption(
      new Option("--timeout <seconds>", "Connection timeout")
        .env("C64_TIMEOUT")
        .default("10")
    )
    .addOption(
      new Option("--no-color", "Disable colored output")
    )
    .addOption(
      new Option("--no-input", "Never prompt for input (fail instead)")
    );

  // ── Device Info ────────────────────────────────────────────────

  program
    .command("info")
    .description("Show device info and status")
    .addHelpText("after", `
Examples:
  c64 info                 Show device status
  c64 info --json          JSON output for scripting
  c64 info --host 10.0.0.5 Query a specific device`)
    .action(async (_opts, cmd) => {
      const { info } = await import("./commands/info.js");
      await info(cmd.optsWithGlobals());
    });

  program
    .command("drives")
    .description("Show drive status (what is mounted)")
    .addHelpText("after", `
Examples:
  c64 drives               Show drive A and B status
  c64 drives --json        JSON output`)
    .action(async (_opts, cmd) => {
      const { drives } = await import("./commands/drives.js");
      await drives(cmd.optsWithGlobals());
    });

  // ── Disk Operations ───────────────────────────────────────────

  program
    .command("mount")
    .description("Mount a disk image to a drive")
    .argument("<file>", "Disk image path, URL, or zip file")
    .option("-d, --drive <letter>", "Drive letter (a or b)", "a")
    .addHelpText("after", `
Examples:
  c64 mount game.d64              Mount to Drive A
  c64 mount game.d64 --drive b    Mount to Drive B
  c64 mount game.zip              Extract and mount D64 from zip
  c64 mount https://example.com/game.d64   Download and mount`)
    .action(async (file, opts, cmd) => {
      const { mount } = await import("./commands/mount.js");
      await mount(file, { ...opts, ...cmd.optsWithGlobals() });
    });

  program
    .command("eject")
    .description("Eject disk from a drive")
    .option("-d, --drive <letter>", "Drive letter (a or b)", "a")
    .option("--all", "Eject both drives")
    .addHelpText("after", `
Examples:
  c64 eject                Eject Drive A
  c64 eject --drive b      Eject Drive B
  c64 eject --all          Eject both drives`)
    .action(async (opts, cmd) => {
      const { eject } = await import("./commands/eject.js");
      await eject({ ...opts, ...cmd.optsWithGlobals() });
    });

  // ── Run & Play ────────────────────────────────────────────────

  program
    .command("run")
    .description("Auto-detect file type and run (CRT/PRG/D64)")
    .argument("<file>", "File to run (local path, URL, or zip)")
    .addHelpText("after", `
Examples:
  c64 run game.crt         Run a cartridge image
  c64 run game.prg         Run a PRG file
  c64 run game.d64         Mount and load
  c64 run game.zip         Extract and run
  c64 run https://example.com/game.prg`)
    .action(async (file, _opts, cmd) => {
      const { run } = await import("./commands/run.js");
      await run(file, cmd.optsWithGlobals());
    });

  program
    .command("play")
    .description("Full play sequence: mount, reset, LOAD, RUN")
    .argument("<file>", "Disk image to play (local path, URL, or zip)")
    .option("-d, --drive <letter>", "Drive letter", "a")
    .option("--boot-delay <ms>", "Delay after reset (ms)", "3000")
    .option("--load-delay <ms>", "Delay after LOAD (ms)", "6000")
    .addHelpText("after", `
Examples:
  c64 play game.d64                Mount, reset, LOAD"*",8,1, RUN
  c64 play game.zip                Extract and play
  c64 play https://example.com/game.d64`)
    .action(async (file, opts, cmd) => {
      const { play } = await import("./commands/play.js");
      await play(file, { ...opts, ...cmd.optsWithGlobals() });
    });

  // ── Machine Control ───────────────────────────────────────────

  program
    .command("reset")
    .description("Reset the C64")
    .option("--hard", "Hard reset via TCP port 64")
    .addHelpText("after", `
Examples:
  c64 reset                Warm reset via REST API
  c64 reset --hard         Hard reset via TCP protocol`)
    .action(async (opts, cmd) => {
      const { reset } = await import("./commands/reset.js");
      await reset({ ...opts, ...cmd.optsWithGlobals() });
    });

  program
    .command("reboot")
    .description("Reboot the Ultimate hardware")
    .action(async (_opts, cmd) => {
      const { reboot } = await import("./commands/reboot.js");
      await reboot(cmd.optsWithGlobals());
    });

  program
    .command("type")
    .description("Type text on the C64 keyboard")
    .argument("<text>", "Text to type (use \\r for RETURN)")
    .addHelpText("after", `
Examples:
  c64 type 'LOAD"*",8,1'          Type a LOAD command
  c64 type 'RUN\\r'                Type RUN and press RETURN
  c64 type 'POKE 53280,0\\r'       Change border color`)
    .action(async (text, _opts, cmd) => {
      const { typeText } = await import("./commands/type.js");
      await typeText(text, cmd.optsWithGlobals());
    });

  // ── File Operations ───────────────────────────────────────────

  program
    .command("ls")
    .description("List files on device storage")
    .argument("[path]", "Directory to list", "/")
    .addHelpText("after", `
Examples:
  c64 ls                   List root directory
  c64 ls /SD/games/        List a specific directory
  c64 ls --json            JSON output`)
    .action(async (path, _opts, cmd) => {
      const { ls } = await import("./commands/ls.js");
      await ls(path, cmd.optsWithGlobals());
    });

  program
    .command("upload")
    .description("Upload a file to the device")
    .argument("<local>", "Local file to upload")
    .argument("[remote]", "Remote path (default: /Temp/)")
    .option("--mount", "Mount the file after uploading")
    .addHelpText("after", `
Examples:
  c64 upload game.d64              Upload to /Temp/
  c64 upload game.d64 /SD/games/   Upload to specific path
  c64 upload game.d64 --mount      Upload and mount to Drive A`)
    .action(async (local, remote, opts, cmd) => {
      const { upload } = await import("./commands/upload.js");
      await upload(local, remote, { ...opts, ...cmd.optsWithGlobals() });
    });

  // ── Discovery ─────────────────────────────────────────────────

  program
    .command("discover")
    .description("Scan the local network for C64 Ultimate devices")
    .option("--save", "Save the found device to config")
    .option("--all", "List all devices found (not just the first)")
    .option("--subnet <prefix>", "Subnet to scan (e.g., 192.168.1)")
    .addHelpText("after", `
Examples:
  c64 discover             Scan and show first device found
  c64 discover --save      Find and save to config
  c64 discover --all       Show all devices on network`)
    .action(async (opts, cmd) => {
      const { discover } = await import("./commands/discover.js");
      await discover({ ...opts, ...cmd.optsWithGlobals() });
    });

  // ── Data Disks ────────────────────────────────────────────────

  const disk = program
    .command("disk")
    .description("Manage data disks (blank D64 images for saving)");

  disk
    .command("list")
    .description("List all data disks")
    .action(async (_opts, cmd) => {
      const { diskList } = await import("./commands/disk.js");
      await diskList(cmd.optsWithGlobals());
    });

  disk
    .command("create")
    .description("Create a new blank data disk")
    .option("-n, --name <name>", "Disk name (up to 16 characters)")
    .action(async (opts, cmd) => {
      const { diskCreate } = await import("./commands/disk.js");
      await diskCreate({ ...opts, ...cmd.optsWithGlobals() });
    });

  disk
    .command("dir")
    .description("Show the D64 directory listing of a data disk")
    .argument("<id>", "Disk number or name")
    .action(async (id, _opts, cmd) => {
      const { diskDir } = await import("./commands/disk.js");
      await diskDir(id, cmd.optsWithGlobals());
    });

  // ── Configuration ─────────────────────────────────────────────

  const config = program
    .command("config")
    .description("Manage c64 configuration");

  config
    .command("show")
    .description("Show current configuration")
    .action(async (_opts, cmd) => {
      const { configShow } = await import("./commands/config.js");
      await configShow(cmd.optsWithGlobals());
    });

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Config key (e.g., device.host)")
    .argument("<value>", "Value to set")
    .addHelpText("after", `
Examples:
  c64 config set device.host 192.168.1.119
  c64 config set defaults.drive b
  c64 config set device.timeout 15`)
    .action(async (key, value, _opts, cmd) => {
      const { configSet } = await import("./commands/config.js");
      await configSet(key, value, cmd.optsWithGlobals());
    });

  config
    .command("init")
    .description("Interactive first-time setup")
    .action(async (_opts, cmd) => {
      const { configInit } = await import("./commands/config.js");
      await configInit(cmd.optsWithGlobals());
    });

  return program;
}
