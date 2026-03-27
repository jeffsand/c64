/**
 * TCP binary protocol client for port 64.
 *
 * Wire format: [command: u16 LE] [payload_length: u16 LE] [payload]
 *
 * Commands:
 *   0xFF03 CMD_KEYB  -- inject up to 10 bytes into keyboard buffer
 *   0xFF04 CMD_RESET -- reset the C64
 */

import { createConnection, type Socket } from "node:net";
import { DeviceUnreachableError } from "../error.js";
import { petsciiEncode } from "./petscii.js";

const CMD_KEYBOARD = 0xff03;
const CMD_RESET = 0xff04;
const CHUNK_SIZE = 10;
const CHUNK_DELAY_MS = 200;

/** Build a binary command packet. */
function buildPacket(command: number, payload: Buffer): Buffer {
  const packet = Buffer.alloc(4 + payload.length);
  packet.writeUInt16LE(command, 0);
  packet.writeUInt16LE(payload.length, 2);
  payload.copy(packet, 4);
  return packet;
}

/** Send a packet over TCP port 64 and close. */
function sendPacket(host: string, packet: Buffer, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket: Socket = createConnection({ host, port: 64 }, () => {
      socket.write(packet, (err) => {
        socket.end();
        if (err) reject(err);
        else resolve();
      });
    });

    socket.setTimeout(timeout);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new DeviceUnreachableError(host));
    });
    socket.on("error", (err) => {
      socket.destroy();
      reject(new DeviceUnreachableError(host));
    });
  });
}

/** Pause for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Send a reset command via TCP port 64. */
export async function tcpReset(host: string, timeout: number = 5000): Promise<void> {
  const packet = buildPacket(CMD_RESET, Buffer.alloc(0));
  await sendPacket(host, packet, timeout);
}

/**
 * Type text on the C64 by injecting PETSCII into the keyboard buffer.
 * Text is split into 10-byte chunks with 200ms delay between them
 * (the C64 keyboard buffer is 10 bytes).
 *
 * Use \r for RETURN key.
 */
export async function tcpType(
  host: string,
  text: string,
  timeout: number = 5000,
): Promise<void> {
  const bytes = petsciiEncode(text);

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    const packet = buildPacket(CMD_KEYBOARD, chunk);
    await sendPacket(host, packet, timeout);

    // Delay between chunks so the C64 can process the buffer
    if (i + CHUNK_SIZE < bytes.length) {
      await sleep(CHUNK_DELAY_MS);
    }
  }
}
