/**
 * D64 disk image parser, creator, and renamer.
 *
 * Handles all 4 standard D64 sizes:
 *   - 174848  (35 tracks, no error bytes)
 *   - 175531  (35 tracks + 683 error bytes)
 *   - 196608  (40 tracks, no error bytes)
 *   - 197376  (40 tracks + 768 error bytes)
 *
 * Ported from Ready app's D64Parser.swift.
 */

import { petsciiDecode } from "./api/petscii.js";

/** A single entry in the disk directory. */
export interface DirectoryEntry {
  filename: string;
  fileType: string;  // PRG, SEQ, USR, REL, DEL
  blocks: number;
  closed: boolean;
}

/** The parsed directory of a D64 disk image. */
export interface D64Directory {
  diskName: string;
  diskId: string;
  entries: DirectoryEntry[];
  freeBlocks: number;
}

const VALID_SIZES = [174848, 175531, 196608, 197376];

/** Number of sectors per track for standard D64 geometry. */
function sectorsPerTrack(track: number): number {
  if (track >= 1 && track <= 17) return 21;
  if (track >= 18 && track <= 24) return 19;
  if (track >= 25 && track <= 30) return 18;
  if (track >= 31 && track <= 40) return 17;
  return 0;
}

/** Byte offset into the D64 file for a given track and sector. */
function trackOffset(track: number, sector: number): number {
  let result = 0;
  for (let t = 1; t < track; t++) {
    result += sectorsPerTrack(t) * 256;
  }
  return result + sector * 256;
}

/**
 * Read PETSCII bytes from a buffer and convert to a display string.
 * Strips trailing 0xA0 padding.
 */
function readPetscii(data: Buffer, offset: number, length: number): string {
  if (offset + length > data.length) return "";
  const slice = data.subarray(offset, offset + length);
  return petsciiDecode(slice, length);
}

/**
 * Parse a D64 disk image from raw data.
 * Returns null if the data is too small or corrupt.
 */
export function parse(data: Buffer): D64Directory | null {
  if (data.length < 174848) return null;

  // BAM is at track 18, sector 0
  const bamOff = trackOffset(18, 0);

  // Disk name: BAM offset 0x90, 16 bytes
  const diskName = readPetscii(data, bamOff + 0x90, 16);

  // Disk ID: BAM offset 0xA2, 5 bytes (2-char ID + 0xA0 + 2-char DOS type)
  const diskId = readPetscii(data, bamOff + 0xA2, 5);

  // Count free blocks from BAM (tracks 1-35, skip track 18)
  const maxTrack = data.length >= 196608 ? 40 : 35;
  let freeBlocks = 0;
  for (let track = 1; track <= maxTrack; track++) {
    if (track === 18) continue; // directory track
    const entryOff = bamOff + 4 * track;
    if (entryOff < data.length) {
      freeBlocks += data[entryOff]!;
    }
  }

  // Read directory chain starting at track 18, sector 1
  const entries: DirectoryEntry[] = [];
  let dirTrack = 18;
  let dirSector = 1;
  const visited = new Set<number>();

  while (dirTrack !== 0) {
    const key = dirTrack * 256 + dirSector;
    if (visited.has(key)) break;
    visited.add(key);

    const sectorOff = trackOffset(dirTrack, dirSector);
    if (sectorOff + 256 > data.length) break;

    // Next track/sector link
    dirTrack = data[sectorOff]!;
    dirSector = data[sectorOff + 1]!;

    // 8 directory entries per sector, each 32 bytes
    for (let i = 0; i < 8; i++) {
      const entryOff = sectorOff + i * 32;
      const fileTypeByte = data[entryOff + 2]!;

      // Skip empty entries
      if (fileTypeByte === 0x00) continue;

      const closed = (fileTypeByte & 0x80) !== 0;
      const typeIndex = fileTypeByte & 0x0f;

      const FILE_TYPES: Record<number, string> = {
        0: "DEL",
        1: "SEQ",
        2: "PRG",
        3: "USR",
        4: "REL",
      };
      const fileType = FILE_TYPES[typeIndex] ?? "???";

      const filename = readPetscii(data, entryOff + 5, 16);
      const blocksLo = data[entryOff + 0x1e]!;
      const blocksHi = data[entryOff + 0x1f]!;
      const blocks = blocksLo + blocksHi * 256;

      // Skip deleted entries with empty names
      if (filename.length === 0) continue;

      entries.push({ filename, fileType, blocks, closed });
    }
  }

  return { diskName, diskId, entries, freeBlocks };
}

/**
 * Create a blank formatted D64 disk image (174848 bytes).
 * @param diskName - Up to 16 characters for the disk name.
 * @param diskId - Optional 2-character disk ID (default "00").
 */
export function createBlank(diskName: string, diskId: string = "00"): Buffer {
  const disk = Buffer.alloc(174848);

  const bamOff = trackOffset(18, 0);
  disk[bamOff] = 18;       // next dir track
  disk[bamOff + 1] = 1;    // next dir sector
  disk[bamOff + 2] = 0x41; // DOS version 'A'

  // Initialize BAM entries for all 35 tracks
  for (let track = 1; track <= 35; track++) {
    const entryOff = bamOff + 4 * track;
    const secs = sectorsPerTrack(track);

    if (track === 18) {
      // Directory track: sectors 0 and 1 used
      disk[entryOff] = secs - 2;
      let bits = (1 << secs) - 1;
      bits &= ~(1 << 0);
      bits &= ~(1 << 1);
      disk[entryOff + 1] = bits & 0xff;
      disk[entryOff + 2] = (bits >> 8) & 0xff;
      disk[entryOff + 3] = (bits >> 16) & 0xff;
    } else {
      disk[entryOff] = secs;
      const bits = (1 << secs) - 1;
      disk[entryOff + 1] = bits & 0xff;
      disk[entryOff + 2] = (bits >> 8) & 0xff;
      disk[entryOff + 3] = (bits >> 16) & 0xff;
    }
  }

  // Disk name at BAM+0x90 (16 bytes, padded with 0xA0)
  const nameBytes = Buffer.from(diskName.toUpperCase(), "ascii");
  for (let i = 0; i < 16; i++) {
    disk[bamOff + 0x90 + i] = i < nameBytes.length ? nameBytes[i]! : 0xa0;
  }

  // Disk ID at BAM+0xA2 (2 chars + 0xA0 + "2A")
  const idBytes = Buffer.from(diskId.toUpperCase(), "ascii");
  disk[bamOff + 0xa2] = idBytes.length > 0 ? idBytes[0]! : 0x30;
  disk[bamOff + 0xa3] = idBytes.length > 1 ? idBytes[1]! : 0x30;
  disk[bamOff + 0xa4] = 0xa0;
  disk[bamOff + 0xa5] = 0x32; // '2'
  disk[bamOff + 0xa6] = 0x41; // 'A'

  // Initialize directory sector at track 18, sector 1
  const dirOff = trackOffset(18, 1);
  disk[dirOff] = 0;         // no next dir sector
  disk[dirOff + 1] = 0xff;

  return disk;
}

/**
 * Rename a D64 disk image by rewriting the disk name in the BAM.
 * Returns null if the data is too small.
 * @param data - The D64 image buffer.
 * @param newName - New disk name (up to 16 characters).
 */
export function rename(data: Buffer, newName: string): Buffer | null {
  if (data.length < 174848) return null;

  const disk = Buffer.from(data);
  const bamOff = trackOffset(18, 0);

  // Overwrite disk name at BAM+0x90 (16 bytes, padded with 0xA0)
  const nameBytes = Buffer.from(newName.toUpperCase(), "ascii");
  for (let i = 0; i < 16; i++) {
    disk[bamOff + 0x90 + i] = i < nameBytes.length ? nameBytes[i]! : 0xa0;
  }

  return disk;
}
