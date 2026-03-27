#!/usr/bin/env node

/**
 * c64 -- Command your C64 Ultimate from the terminal.
 *
 * A CLI tool for controlling C64 Ultimate devices over the local network.
 * Supports the REST API (port 80), TCP binary protocol (port 64),
 * and file uploads via FTP.
 */

import { createCli } from "./cli.js";

const program = createCli();
program.parse();
