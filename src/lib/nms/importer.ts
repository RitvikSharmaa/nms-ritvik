import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ImportRow, LinkName, NetworkName } from "./types";
import { isLinkName, isNetworkName, isValidIp } from "./constants";
import type { NmsEngine } from "./engine";

const REQUIRED_HEADERS = [
  "username",
  "ip address",
  "device name",
  "link",
  "network name",
];

type RawRow = Record<string, string>;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeRow(raw: RawRow): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normalizeHeader(k)] = String(v ?? "").trim();
  }
  return out;
}

export async function parseUploadFile(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data.map(normalizeRow)),
        error: (err) => reject(err),
      });
    });
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
    return rows.map((r) => normalizeRow(r as RawRow));
  }
  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

export function checkHeaders(rows: RawRow[]): string[] {
  if (rows.length === 0) return ["File contains no data rows."];
  const present = Object.keys(rows[0]);
  const missing = REQUIRED_HEADERS.filter((h) => !present.includes(h));
  return missing.map(
    (h) => `Missing required column: "${h.replace(/\b\w/g, (c) => c.toUpperCase())}"`,
  );
}

export function validateRows(rows: RawRow[], engine: NmsEngine): ImportRow[] {
  const seenIps = new Map<string, number>();
  const seenNames = new Map<string, number>();

  return rows.map((raw, idx) => {
    const rowNumber = idx + 2; // header = row 1
    const username = raw["username"] ?? "";
    const ip = raw["ip address"] ?? "";
    const deviceName = raw["device name"] ?? "";
    const linkRaw = raw["link"] ?? "";
    const networkRaw = raw["network name"] ?? "";

    const errors: string[] = [];
    let duplicateOf: ImportRow["duplicateOf"];

    if (!username) errors.push("Username is required.");
    if (!ip) errors.push("IP Address is required.");
    else if (!isValidIp(ip)) errors.push(`Invalid IP address format: "${ip}".`);
    if (!deviceName) errors.push("Device Name is required.");
    if (!linkRaw) errors.push("Link is required.");
    if (!networkRaw) errors.push("Network Name is required.");

    // network validation
    let network: NetworkName | null = null;
    if (networkRaw) {
      if (isNetworkName(networkRaw)) network = networkRaw;
      else errors.push(`Unknown network "${networkRaw}". Must be Network-1 … Network-5.`);
    }

    // link parsing + validation (comma-separated -> junction rows)
    const links: LinkName[] = [];
    if (linkRaw) {
      const parts = linkRaw.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) errors.push("Link column is empty.");
      for (const part of parts) {
        if (!isLinkName(part)) {
          errors.push(`Unknown link "${part}". Must be Link-1, Link-2 or Link-3.`);
        } else if (links.includes(part)) {
          errors.push(`Duplicate link "${part}" in Link column.`);
        } else {
          links.push(part);
        }
      }
    }

    // duplicate detection within file
    if (ip && isValidIp(ip)) {
      const firstIp = seenIps.get(ip);
      if (firstIp !== undefined) {
        errors.push(`Duplicate IP within file (first seen on row ${firstIp}).`);
        duplicateOf = "file";
      } else {
        seenIps.set(ip, rowNumber);
      }
      // duplicate against inventory
      if (firstIp === undefined && engine.hasIp(ip)) {
        errors.push(`IP ${ip} already exists in the device inventory.`);
        duplicateOf = "inventory";
      }
    }

    if (deviceName && network) {
      const key = `${network}::${deviceName.toLowerCase()}`;
      const firstName = seenNames.get(key);
      if (firstName !== undefined) {
        errors.push(`Duplicate device name within file (row ${firstName}).`);
        duplicateOf = duplicateOf ?? "file";
      } else {
        seenNames.set(key, rowNumber);
        if (engine.hasDeviceName(deviceName, network)) {
          errors.push(`Device "${deviceName}" already exists in ${network}.`);
          duplicateOf = duplicateOf ?? "inventory";
        }
      }
    }

    return {
      rowNumber,
      username,
      ip,
      deviceName,
      linkRaw,
      networkRaw,
      links: links.sort() as LinkName[],
      network,
      errors,
      duplicateOf,
    };
  });
}

export function sampleCsv(): string {
  return [
    "Username,IP Address,Device Name,Link,Network Name",
    "john,10.10.1.24,Core-Router-01,\"Link-1,Link-3\",Network-2",
    "admin,10.0.0.1,Edge-Firewall-01,Link-1,Network-1",
    "noc,10.0.1.10,Dist-Switch-09,\"Link-1,Link-2,Link-3\",Network-3",
    "operator,10.0.2.20,App-Server-04,Link-2,Network-4",
    "admin,10.0.3.5,Access-Switch-11,\"Link-2,Link-3\",Network-5",
  ].join("\n");
}
