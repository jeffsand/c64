/**
 * Type definitions for C64 Ultimate API responses.
 */

/** Device info from GET /v1/info. */
export interface DeviceInfo {
  product: string;
  firmwareVersion: string;
  fpgaVersion: string;
  coreVersion: string;
  hostname: string;
  uniqueId: string;
}

/** Drive status from GET /v1/drives. */
export interface DriveStatus {
  id: string;           // "a" or "b"
  enabled: boolean;
  driveType: string;    // "1541", "1571", etc.
  imageFile: string;    // mounted image path, empty if none
  diskName: string;     // disk name from image header
}
