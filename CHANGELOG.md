# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - Unreleased

### Added

- CLI skeleton with all commands defined
- Configuration management (~/.config/c64/config.json)
- Error types with helpful guidance messages
- Output formatting (JSON, pretty, TTY detection)
- Global flags: --host, --json, --quiet, --timeout, --no-color, --no-input
- Environment variable support: C64_HOST, C64_TIMEOUT
- `c64 ls` command -- list files on device storage via FTP
  - Extension highlighting (green for C64 files, yellow for archives, blue for directories)
  - JSON output with --json flag
  - Handles FTP timeout (exit code 28) gracefully
- `c64 completions` command -- generate shell completions for bash, zsh, and fish
- `c64 watch` command -- poll drive status every 2 seconds and display changes
  - Only prints when drive status changes (after initial display)
  - Clean shutdown on SIGINT
- `c64 info` now shows drive status in pretty output (not in --json mode)
