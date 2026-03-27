# c64

Command your C64 Ultimate from the terminal.

```
$ c64 info
Product:  Ultimate 64 Elite
Firmware: 3.14
Drive A:  Boulder Dash (1984)
Drive B:  empty
```

## Install

```bash
npm install -g c64-cli

# Or with Homebrew (coming soon)
brew tap jeffsand/tools
brew install c64
```

## Quick Start

```bash
c64 discover              # find your device on the network
c64 info                  # check device status
c64 mount game.d64        # mount a disk image
c64 play game.d64         # full auto-play: mount, LOAD, RUN
c64 type 'LOAD"*",8,1'   # type on the C64 keyboard
```

## Commands

```
c64 info                  Device info and status
c64 drives                Drive status (what is mounted)
c64 mount <file>          Mount a disk image (D64, ZIP, URL)
c64 eject                 Eject a drive
c64 run <file>            Auto-detect file type and run
c64 play <file>           Full play sequence: mount, reset, LOAD, RUN
c64 reset                 Reset the C64
c64 reboot                Reboot the Ultimate hardware
c64 type <text>           Type on the C64 keyboard
c64 ls [path]             List files on device storage
c64 upload <file>         Upload a file to the device
c64 discover              Scan network for devices
c64 disk <cmd>            Manage data disks
c64 config <cmd>          Manage configuration
```

Run `c64 --help` for the full reference, or `c64 <command> --help` for details on any command.

## For Agents

Every command supports `--json` for structured output:

```bash
c64 info --json | jq .firmware_version
c64 drives --json | jq '.[0].image_file'
```

Exit codes: 0 = success, 1 = error, 2 = usage error, 3 = device error, 4 = network error.

## Configuration

```bash
c64 config set device.host 192.168.1.119
c64 config show
```

Or use environment variables: `C64_HOST`, `C64_TIMEOUT`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
