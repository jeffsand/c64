/**
 * c64 discover -- Scan the local network for C64 Ultimate devices.
 *
 * Probes all 254 addresses on each /24 subnet with concurrent HTTP
 * requests to /v1/info, looking for Ultimate devices.
 */

import { networkInterfaces } from "node:os";
import { loadConfig, saveConfig } from "../config.js";
import { printData, printSuccess, printInfo, printError } from "../output.js";

/** A discovered device on the network. */
interface DiscoveredDevice {
  host: string;
  product: string;
  hostname: string;
}

/**
 * Get all local IPv4 /24 subnets from network interfaces.
 * Returns unique subnet prefixes like "192.168.1".
 */
function getLocalSubnets(): string[] {
  const ifaces = networkInterfaces();
  const subnets = new Set<string>();

  for (const entries of Object.values(ifaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        const parts = entry.address.split(".");
        if (parts.length === 4) {
          subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
    }
  }

  return [...subnets];
}

/**
 * Probe a single IP address for a C64 Ultimate device.
 * Returns the device info if found, null otherwise.
 */
async function probe(host: string): Promise<DiscoveredDevice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const resp = await fetch(`http://${host}/v1/info`, {
      signal: controller.signal,
    });
    if (!resp.ok) return null;

    const text = await resp.text();
    const lower = text.toLowerCase();

    // Check for C64 Ultimate device signatures
    if (!lower.includes("ultimate") && !lower.includes("1541")) {
      return null;
    }

    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      return {
        host,
        product: String(data["product"] ?? "Unknown"),
        hostname: String(data["hostname"] ?? ""),
      };
    } catch {
      return { host, product: "C64 Ultimate", hostname: "" };
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scan subnets for C64 Ultimate devices.
 */
export async function discover(opts: Record<string, unknown>): Promise<void> {
  // Determine which subnets to scan
  let subnets: string[];
  if (typeof opts["subnet"] === "string" && opts["subnet"]) {
    subnets = [opts["subnet"]];
  } else {
    subnets = getLocalSubnets();
  }

  if (subnets.length === 0) {
    printError(
      "No network interfaces found.",
      "Check your network connection or specify a subnet: c64 discover --subnet 192.168.1",
    );
    process.exit(4);
  }

  printInfo(`Scanning ${subnets.length} subnet(s): ${subnets.join(", ")}`, opts);

  const devices: DiscoveredDevice[] = [];
  let completed = 0;
  const totalProbes = subnets.length * 254;

  // Build all probe promises
  const probes: Promise<void>[] = [];
  for (const subnet of subnets) {
    for (let i = 1; i <= 254; i++) {
      const host = `${subnet}.${i}`;
      probes.push(
        probe(host).then((device) => {
          completed++;
          if (device) {
            devices.push(device);
          }
          // Progress indicator every 50 probes
          if (!opts["quiet"] && !opts["json"] && completed % 50 === 0) {
            process.stderr.write(`\r  Probing... ${completed}/${totalProbes}`);
          }
        }),
      );
    }
  }

  await Promise.allSettled(probes);

  // Clear progress line
  if (!opts["quiet"] && !opts["json"]) {
    process.stderr.write(`\r  Probing... ${totalProbes}/${totalProbes}\n`);
  }

  if (devices.length === 0) {
    printError(
      "No C64 Ultimate devices found on the network.",
      [
        "Make sure your device is powered on and connected to the same network.",
        "Try specifying a subnet: c64 discover --subnet 192.168.1",
      ].join("\n"),
    );
    process.exit(4);
    return;
  }

  // Output results
  if (opts["json"]) {
    printData(devices, opts);
  } else {
    printInfo(`Found ${devices.length} device(s):`, opts);
    for (const device of devices) {
      const name = device.hostname ? ` (${device.hostname})` : "";
      console.log(`  ${device.host}  ${device.product}${name}`);
    }
  }

  // Save first device to config if --save
  if (opts["save"] && devices.length > 0) {
    const config = loadConfig();
    config.device.host = devices[0]!.host;
    saveConfig(config);
    printSuccess(`Saved ${devices[0]!.host} to config`, opts);
  }
}
