/**
 * c64 disk -- Manage data disks (blank D64 images for saving).
 *
 * Data disks and their manifest live in ~/.config/c64/disks/.
 * Each disk is a standard 174848-byte D64 image.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { configDir } from "../config.js";
import { createBlank, parse } from "../d64.js";
import { printData, printError, printInfo, printSuccess } from "../output.js";

/** A single entry in the disk manifest. */
interface ManifestEntry {
  id: number;
  name: string;
  filename: string;
  created: string;
  notes: string;
}

/** The disk manifest file shape. */
interface Manifest {
  disks: ManifestEntry[];
}

/** Returns the directory where data disks are stored. */
function disksDir(): string {
  return join(configDir(), "disks");
}

/** Returns the path to the manifest file. */
function manifestPath(): string {
  return join(disksDir(), "manifest.json");
}

/** Load the disk manifest, creating it if it does not exist. */
function loadManifest(): Manifest {
  const path = manifestPath();
  if (!existsSync(path)) {
    return { disks: [] };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return { disks: [] };
  }
}

/** Save the disk manifest to disk. */
function saveManifest(manifest: Manifest): void {
  const dir = disksDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * List all data disks.
 */
export async function diskList(opts: Record<string, unknown>): Promise<void> {
  const manifest = loadManifest();

  if (manifest.disks.length === 0) {
    if (opts["json"]) {
      printData([], opts);
    } else {
      printInfo("No data disks yet. Create one with: c64 disk create --name SAVE-01", opts);
    }
    return;
  }

  if (opts["json"]) {
    printData(manifest.disks, opts);
    return;
  }

  // Table output
  console.log("  ID  Name              Filename              Created");
  console.log("  --  ----              --------              -------");
  for (const disk of manifest.disks) {
    const id = String(disk.id).padEnd(4);
    const name = disk.name.padEnd(18);
    const filename = disk.filename.padEnd(22);
    const created = disk.created.split("T")[0] ?? disk.created;
    console.log(`  ${id}${name}${filename}${created}`);
  }
}

/**
 * Create a new blank data disk.
 */
export async function diskCreate(opts: Record<string, unknown>): Promise<void> {
  const manifest = loadManifest();

  // Determine next ID
  const maxId = manifest.disks.reduce((max, d) => Math.max(max, d.id), 0);
  const nextId = maxId + 1;

  // Determine disk name
  const name = typeof opts["name"] === "string" && opts["name"]
    ? opts["name"].toUpperCase().slice(0, 16)
    : `SAVE-${String(nextId).padStart(2, "0")}`;

  // Create the D64 image
  const d64 = createBlank(name);

  // Save to disk
  const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.d64`;
  const dir = disksDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, filename);
  writeFileSync(filePath, d64);

  // Update manifest
  const entry: ManifestEntry = {
    id: nextId,
    name,
    filename,
    created: new Date().toISOString(),
    notes: "",
  };
  manifest.disks.push(entry);
  saveManifest(manifest);

  if (opts["json"]) {
    printData(entry, opts);
  } else {
    printSuccess(`Created data disk #${nextId}: ${name} (${filename})`, opts);
  }
}

/**
 * Show the D64 directory listing of a data disk.
 */
export async function diskDir(id: string, opts: Record<string, unknown>): Promise<void> {
  const manifest = loadManifest();

  // Find the disk by ID or name
  const numId = parseInt(id, 10);
  const entry = manifest.disks.find((d) =>
    d.id === numId || d.name.toLowerCase() === id.toLowerCase()
  );

  if (!entry) {
    printError(
      `Data disk not found: ${id}`,
      "Run 'c64 disk list' to see available disks.",
    );
    process.exit(2);
    return;
  }

  const filePath = join(disksDir(), entry.filename);
  if (!existsSync(filePath)) {
    printError(
      `Disk file missing: ${entry.filename}`,
      `Expected at ${filePath}. The manifest references a file that no longer exists.`,
    );
    process.exit(1);
    return;
  }

  const data = readFileSync(filePath);
  const dir = parse(data);

  if (!dir) {
    printError(
      `Failed to parse D64: ${entry.filename}`,
      "The file may be corrupt. Try creating a new disk with: c64 disk create",
    );
    process.exit(1);
    return;
  }

  if (opts["json"]) {
    printData(dir, opts);
    return;
  }

  // C64-style directory listing
  console.log(`0 "${dir.diskName.padEnd(16)}" ${dir.diskId}`);
  for (const file of dir.entries) {
    const blocks = String(file.blocks).padStart(3);
    const star = file.closed ? " " : "*";
    console.log(`${blocks} "${file.filename}"${star} ${file.fileType}`);
  }
  console.log(`${dir.freeBlocks} BLOCKS FREE.`);
}
