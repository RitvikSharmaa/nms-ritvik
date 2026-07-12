import { Readable } from "stream";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import { z } from "zod";
import { query } from "../config/db";
import { deviceRepository } from "../repositories/device.repository";
import { LINK_NAMES, NETWORK_NAMES, type LinkName, type NetworkName } from "../domain/types";
import { badRequest } from "../utils/http-error";
import { emitDeviceImported } from "../sockets/io";

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::)$/;

const rowSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  ip: z
    .string()
    .trim()
    .refine((v) => IPV4_RE.test(v) || IPV6_RE.test(v), "Invalid IP address format"),
  deviceName: z.string().trim().min(1, "Device Name is required").max(200),
  linkRaw: z.string().trim().min(1, "Link is required"),
  networkRaw: z.string().trim().min(1, "Network Name is required"),
});

export interface RowResult {
  rowNumber: number;
  username: string;
  ip: string;
  deviceName: string;
  links: LinkName[];
  network: NetworkName | null;
  errors: string[];
  action: "create" | "update" | "invalid";
}

export interface UploadReport {
  uploadId: string;
  fileName: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  removedRows: number;
  successRows: number;
  failedRows: number;
  rows: RowResult[];
}

interface RawRow {
  username: string;
  ip: string;
  deviceName: string;
  linkRaw: string;
  networkRaw: string;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function mapRow(record: Record<string, string>): RawRow {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) norm[normalizeHeader(k)] = String(v ?? "").trim();
  return {
    username: norm["username"] ?? "",
    ip: norm["ip address"] ?? "",
    deviceName: norm["device name"] ?? "",
    linkRaw: norm["link"] ?? "",
    networkRaw: norm["network name"] ?? "",
  };
}

async function parseCsv(buffer: Buffer): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const rows: RawRow[] = [];
    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (record: Record<string, string>) => rows.push(mapRow(record)))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseXlsx(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return records.map(mapRow);
}

export const uploadService = {
  /**
   * Full import pipeline: parse -> validate -> dedupe -> insert devices +
   * device_links junction rows -> persist upload report.
   */
  async processFile(
    fileName: string,
    buffer: Buffer,
    userId: string | null,
    dryRun: boolean,
  ): Promise<UploadReport> {
    const lower = fileName.toLowerCase();
    let raw: RawRow[];
    if (lower.endsWith(".csv")) raw = await parseCsv(buffer);
    else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) raw = parseXlsx(buffer);
    else throw badRequest("Unsupported file type — upload .csv or .xlsx");

    if (raw.length === 0) throw badRequest("File contains no data rows");

    const seenIps = new Map<string, number>();
    const seenNames = new Map<string, number>();
    const results: RowResult[] = [];

    for (let i = 0; i < raw.length; i++) {
      const rowNumber = i + 2;
      const row = raw[i];
      const errors: string[] = [];

      const parsed = rowSchema.safeParse(row);
      if (!parsed.success) {
        errors.push(...parsed.error.errors.map((e) => e.message));
      }

      // network validation
      let network: NetworkName | null = null;
      if (row.networkRaw) {
        if ((NETWORK_NAMES as readonly string[]).includes(row.networkRaw)) {
          network = row.networkRaw as NetworkName;
        } else {
          errors.push(`Unknown network "${row.networkRaw}"`);
        }
      }

      // link splitting + validation (junction table, never CSV storage)
      const links: LinkName[] = [];
      if (row.linkRaw) {
        for (const part of row.linkRaw.split(",").map((p) => p.trim()).filter(Boolean)) {
          if (!(LINK_NAMES as readonly string[]).includes(part)) {
            errors.push(`Unknown link "${part}"`);
          } else if (!links.includes(part as LinkName)) {
            links.push(part as LinkName);
          }
        }
        if (links.length === 0 && errors.length === 0) errors.push("No valid links");
      }

      // duplicates within file
      if (row.ip) {
        const first = seenIps.get(row.ip);
        if (first !== undefined) errors.push(`Duplicate IP within file (row ${first})`);
        else {
          seenIps.set(row.ip, rowNumber);
          if (errors.length === 0 && (await deviceRepository.existsByIp(row.ip))) {
            errors.push(`IP ${row.ip} already exists in inventory`);
          }
        }
      }
      if (row.deviceName && network) {
        const key = `${network}::${row.deviceName.toLowerCase()}`;
        const first = seenNames.get(key);
        if (first !== undefined) errors.push(`Duplicate device name within file (row ${first})`);
        else {
          seenNames.set(key, rowNumber);
          if (
            errors.length === 0 &&
            (await deviceRepository.existsByName(row.deviceName, network))
          ) {
            errors.push(`Device "${row.deviceName}" already exists in ${network}`);
          }
        }
      }

      results.push({
        rowNumber,
        username: row.username,
        ip: row.ip,
        deviceName: row.deviceName,
        links: links.sort() as LinkName[],
        network,
        errors,
      });
    }

    let successRows = 0;
    if (!dryRun) {
      for (const r of results) {
        if (r.errors.length > 0 || !r.network) continue;
        try {
          await deviceRepository.createWithLinks({
            username: r.username,
            ip: r.ip,
            deviceName: r.deviceName,
            network: r.network,
            links: r.links,
          });
          successRows++;
        } catch (err) {
          r.errors.push(
            err instanceof Error ? `Database error: ${err.message}` : "Database error",
          );
        }
      }
      if (successRows > 0) emitDeviceImported(successRows);
    }

    const failedRows = results.filter((r) => r.errors.length > 0).length;
    const { rows } = await query<{ id: string }>(
      `INSERT INTO uploads (file_name, uploaded_by, total_rows, success_rows, failed_rows, error_report)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        fileName,
        userId,
        results.length,
        successRows,
        failedRows,
        JSON.stringify(results.filter((r) => r.errors.length > 0)),
      ],
    );

    return {
      uploadId: rows[0].id,
      fileName,
      totalRows: results.length,
      successRows,
      failedRows,
      rows: results,
    };
  },
};
