import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { dashboardService, type NetworkStats } from "./dashboard.service";

const HEADERS = [
  "Network",
  "Devices",
  "Online",
  "Offline",
  "Avg Latency (ms)",
  "Avg Loss (%)",
  "Avg Uptime (%)",
  "BW In (Mbps)",
  "BW Out (Mbps)",
  "Active Alerts",
];

function toRow(s: NetworkStats): (string | number)[] {
  return [
    s.network,
    s.total_devices,
    s.online,
    s.offline,
    s.avg_latency ?? 0,
    s.avg_packet_loss,
    s.avg_uptime,
    s.bandwidth_in,
    s.bandwidth_out,
    s.active_alerts,
  ];
}

export const reportService = {
  async csv(): Promise<string> {
    const stats = await dashboardService.networkStats();
    return [HEADERS.join(","), ...stats.map((s) => toRow(s).join(","))].join("\n");
  },

  async xlsx(): Promise<Buffer> {
    const stats = await dashboardService.networkStats();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Network Report");
    ws.addRow(["NetPulse NMS — Network Performance Report"]);
    ws.addRow([`Generated: ${new Date().toISOString()}`]);
    ws.addRow([]);
    const header = ws.addRow(HEADERS);
    header.font = { bold: true };
    for (const s of stats) ws.addRow(toRow(s));
    ws.columns.forEach((c) => {
      c.width = 18;
    });
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  },

  async pdf(): Promise<Buffer> {
    const stats = await dashboardService.networkStats();
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: "landscape", margin: 36 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text("NetPulse NMS — Network Performance Report");
      doc.fontSize(9).fillColor("#555").text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown(1.5);

      const colW = 72;
      const startX = doc.x;
      let y = doc.y;
      doc.fontSize(8).fillColor("#000");
      HEADERS.forEach((h, i) => doc.text(h, startX + i * colW, y, { width: colW - 4 }));
      y += 18;
      for (const s of stats) {
        toRow(s).forEach((v, i) =>
          doc.text(String(v), startX + i * colW, y, { width: colW - 4 }),
        );
        y += 16;
      }
      doc.end();
    });
  },
};
