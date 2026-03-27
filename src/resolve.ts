/**
 * Smart input resolution -- handle any file input type.
 *
 * Resolves URLs, zip archives, directories, and raw files into a
 * playable C64 file path. Used by mount, run, and play commands.
 */

import { existsSync, statSync, readdirSync, mkdtempSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync } from "node:fs";
import { UnsupportedFormatError } from "./error.js";

/** Result of resolving a file input. */
export interface ResolvedFile {
  path: string;        // local path to the playable file
  originalName: string; // original filename for display
  cleanup: boolean;    // true if temp file that should be cleaned up
}

/** File extensions considered playable on C64, in priority order. */
const PLAYABLE_EXTENSIONS = [".d64", ".crt", ".prg", ".t64", ".g64", ".tap"];

/**
 * Check if a file extension is a playable C64 format.
 */
export function isPlayable(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return PLAYABLE_EXTENSIONS.includes(ext);
}

/**
 * Resolve any input (URL, zip, directory, or file) to a playable C64 file.
 *
 * Resolution order:
 * 1. URL (http/https) -- download to temp, then re-resolve
 * 2. ZIP archive -- extract, find first playable file
 * 3. Directory -- look for Disk1.d64, then first playable file
 * 4. Playable file -- return as-is
 * 5. Otherwise -- throw UnsupportedFormatError
 */
export async function resolve(input: string): Promise<ResolvedFile> {
  // 1. URL -- download first, then re-resolve
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return resolveUrl(input);
  }

  // 2. ZIP -- extract and find playable file
  if (input.toLowerCase().endsWith(".zip")) {
    return resolveZip(input);
  }

  // 3. Directory -- find playable file inside
  if (existsSync(input) && statSync(input).isDirectory()) {
    return resolveDirectory(input);
  }

  // 4. Playable file -- return directly
  if (isPlayable(input)) {
    return {
      path: input,
      originalName: basename(input),
      cleanup: false,
    };
  }

  // 5. Device path (starts with /) -- pass through for remote paths
  if (input.startsWith("/")) {
    return {
      path: input,
      originalName: basename(input),
      cleanup: false,
    };
  }

  throw new UnsupportedFormatError(input);
}

/**
 * Download a URL to a temp directory and re-resolve the downloaded file.
 */
async function resolveUrl(url: string): Promise<ResolvedFile> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Download failed: HTTP ${response.status} from ${url}. ` +
      "Check that the URL is correct and accessible."
    );
  }

  const urlPath = new URL(url).pathname;
  const filename = basename(urlPath) || "download";
  const tempDir = mkdtempSync(join(tmpdir(), "c64-dl-"));
  const tempPath = join(tempDir, filename);

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(tempPath, buffer);

  // Re-resolve the downloaded file (might be a zip, d64, etc.)
  const resolved = await resolveLocal(tempPath);
  return {
    ...resolved,
    originalName: filename,
    cleanup: true,
  };
}

/**
 * Resolve a local file (zip or playable).
 */
async function resolveLocal(filePath: string): Promise<ResolvedFile> {
  if (filePath.toLowerCase().endsWith(".zip")) {
    return resolveZip(filePath);
  }

  if (isPlayable(filePath)) {
    return {
      path: filePath,
      originalName: basename(filePath),
      cleanup: false,
    };
  }

  throw new UnsupportedFormatError(filePath);
}

/**
 * Extract a zip archive and find the first playable C64 file.
 */
async function resolveZip(zipPath: string): Promise<ResolvedFile> {
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Sort entries by playable priority
  const playableEntries = entries.filter((e) =>
    !e.isDirectory && isPlayable(e.entryName)
  );

  if (playableEntries.length === 0) {
    throw new UnsupportedFormatError(zipPath);
  }

  // Sort by extension priority
  playableEntries.sort((a, b) => {
    const extA = extname(a.entryName).toLowerCase();
    const extB = extname(b.entryName).toLowerCase();
    return PLAYABLE_EXTENSIONS.indexOf(extA) - PLAYABLE_EXTENSIONS.indexOf(extB);
  });

  const best = playableEntries[0]!;
  const tempDir = mkdtempSync(join(tmpdir(), "c64-zip-"));
  zip.extractEntryTo(best, tempDir, false, true);

  return {
    path: join(tempDir, basename(best.entryName)),
    originalName: basename(best.entryName),
    cleanup: true,
  };
}

/**
 * Find a playable file inside a directory.
 * Prefers Disk1.d64, then searches by extension priority.
 */
function resolveDirectory(dirPath: string): ResolvedFile {
  const files = readdirSync(dirPath);

  // Check for Disk1.d64 first (common C64 Dreams convention)
  const disk1 = files.find((f) => f.toLowerCase() === "disk1.d64");
  if (disk1) {
    return {
      path: join(dirPath, disk1),
      originalName: disk1,
      cleanup: false,
    };
  }

  // Find first playable file by priority
  for (const ext of PLAYABLE_EXTENSIONS) {
    const match = files.find((f) => f.toLowerCase().endsWith(ext));
    if (match) {
      return {
        path: join(dirPath, match),
        originalName: match,
        cleanup: false,
      };
    }
  }

  throw new UnsupportedFormatError(dirPath);
}
