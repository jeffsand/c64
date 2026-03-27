# Architecture

```
src/
  index.ts          Entry point (thin -- just calls cli)
  cli.ts            Command definitions (Commander.js)
  config.ts         Config file management (~/.config/c64/)
  error.ts          Error types with helpful messages
  output.ts         Output formatting (JSON, pretty, TTY detection)
  version.ts        Package version constant

  commands/         One file per command
    info.ts         c64 info
    drives.ts       c64 drives
    mount.ts        c64 mount
    eject.ts        c64 eject
    run.ts          c64 run
    play.ts         c64 play
    reset.ts        c64 reset
    reboot.ts       c64 reboot
    type.ts         c64 type
    ls.ts           c64 ls
    upload.ts       c64 upload
    discover.ts     c64 discover
    disk.ts         c64 disk *
    config.ts       c64 config *

  api/              Protocol clients (Phase 2+)
    rest.ts         HTTP REST client for /v1/* endpoints
    socket.ts       TCP port 64 binary protocol
```

## Adding a new command

1. Create `src/commands/mycommand.ts` with an exported async function
2. Add the command definition in `src/cli.ts`
3. Add tests in `src/tests/mycommand.test.ts`
