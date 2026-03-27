/**
 * HTTP REST client for the C64 Ultimate API (port 80).
 *
 * Endpoints:
 *   GET  /v1/info              Device info
 *   GET  /v1/drives            Drive status
 *   PUT  /v1/drives/a:mount    Mount disk to Drive A
 *   PUT  /v1/drives/a:remove   Eject Drive A
 *   PUT  /v1/runners:run_crt   Run cartridge
 *   PUT  /v1/runners:run_prg   Run PRG file
 *   PUT  /v1/machine:reset     Reset C64
 *   PUT  /v1/machine:reboot    Reboot Ultimate
 */

import type { DeviceInfo, DriveStatus } from "./types.js";
import { DeviceUnreachableError } from "../error.js";

export class UltimateClient {
  readonly host: string;
  readonly timeout: number;

  constructor(host: string, timeout: number = 10000) {
    this.host = host;
    this.timeout = timeout;
  }

  private get baseUrl(): string {
    return `http://${this.host}`;
  }

  /** Fetch with timeout and error handling. */
  private async request(path: string, method: string = "GET"): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { method, signal: controller.signal });
      return response;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new DeviceUnreachableError(this.host);
      }
      throw new DeviceUnreachableError(this.host);
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET /v1/info -- device info. */
  async info(): Promise<DeviceInfo> {
    const resp = await this.request("/v1/info");
    if (!resp.ok) throw new DeviceUnreachableError(this.host);

    const data = await resp.json() as Record<string, unknown>;
    return {
      product: String(data["product"] ?? ""),
      firmwareVersion: String(data["firmware_version"] ?? ""),
      fpgaVersion: String(data["fpga_version"] ?? ""),
      coreVersion: String(data["core_version"] ?? ""),
      hostname: String(data["hostname"] ?? ""),
      uniqueId: String(data["unique_id"] ?? ""),
    };
  }

  /**
   * GET /v1/drives -- drive status.
   *
   * The Ultimate returns a non-standard JSON format:
   * {"drives": [{"a": {...}}, {"b": {...}}]}
   * We normalize this to a clean array.
   */
  async drives(): Promise<DriveStatus[]> {
    const resp = await this.request("/v1/drives");
    if (!resp.ok) throw new DeviceUnreachableError(this.host);

    const text = await resp.text();
    const result: DriveStatus[] = [];

    try {
      // Try parsing the non-standard format
      const data = JSON.parse(text) as Record<string, unknown>;
      const drivesArray = data["drives"];

      if (Array.isArray(drivesArray)) {
        for (const item of drivesArray) {
          if (typeof item === "object" && item !== null) {
            const obj = item as Record<string, unknown>;
            for (const [letter, driveData] of Object.entries(obj)) {
              if (typeof driveData === "object" && driveData !== null) {
                const d = driveData as Record<string, unknown>;
                result.push({
                  id: letter,
                  enabled: Boolean(d["enabled"] ?? true),
                  driveType: String(d["type"] ?? "1541"),
                  imageFile: String(d["image"] ?? ""),
                  diskName: String(d["name"] ?? ""),
                });
              }
            }
          }
        }
      }
    } catch {
      // If parsing fails, return empty
    }

    return result;
  }

  /** PUT /v1/drives/{drive}:mount?image={path} */
  async mount(drive: string, imagePath: string): Promise<void> {
    const encoded = encodeURIComponent(imagePath);
    const resp = await this.request(
      `/v1/drives/${drive}:mount?image=${encoded}`,
      "PUT",
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Mount failed (${resp.status}): ${body}`);
    }
  }

  /** PUT /v1/drives/{drive}:remove */
  async eject(drive: string): Promise<void> {
    const resp = await this.request(`/v1/drives/${drive}:remove`, "PUT");
    if (!resp.ok) {
      throw new Error(`Eject failed (${resp.status})`);
    }
  }

  /** PUT /v1/runners:run_crt?file={path} */
  async runCrt(filePath: string): Promise<void> {
    const encoded = encodeURIComponent(filePath);
    const resp = await this.request(`/v1/runners:run_crt?file=${encoded}`, "PUT");
    if (!resp.ok) throw new Error(`Run CRT failed (${resp.status})`);
  }

  /** PUT /v1/runners:run_prg?file={path} */
  async runPrg(filePath: string): Promise<void> {
    const encoded = encodeURIComponent(filePath);
    const resp = await this.request(`/v1/runners:run_prg?file=${encoded}`, "PUT");
    if (!resp.ok) throw new Error(`Run PRG failed (${resp.status})`);
  }

  /** PUT /v1/machine:reset */
  async reset(): Promise<void> {
    const resp = await this.request("/v1/machine:reset", "PUT");
    if (!resp.ok) throw new Error(`Reset failed (${resp.status})`);
  }

  /** PUT /v1/machine:reboot */
  async reboot(): Promise<void> {
    const resp = await this.request("/v1/machine:reboot", "PUT");
    if (!resp.ok) throw new Error(`Reboot failed (${resp.status})`);
  }
}
