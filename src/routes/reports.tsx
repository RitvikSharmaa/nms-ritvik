import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNms } from "@/lib/nms/useNms";
import { NETWORKS } from "@/lib/nms/constants";
import { fmtDateTime } from "@/lib/nms/format";
import type { NmsEngine } from "@/lib/nms/engine";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — NetPulse NMS" },
      {
        name: "description",
        content:
          "Generate daily, weekly, monthly or custom monitoring reports and export them as PDF, Excel or CSV.",
      },
      { property: "og:title", content: "Reports — NetPulse NMS" },
      { property: "og:description", content: "Historical performance reporting with PDF/Excel/CSV export." },
    ],
  }),
  component: ReportsPage,
});

type Period = "daily" | "weekly" | "monthly" | "custom";

interface ReportRow {
  network: string;
  devices: number;
  online: number;
  offline: number;
  avgLatency: string;
  avgLoss: string;
  avgUptime: string;
  bwIn: string;
  bwOut: string;
  alerts: number;
  health: number;
}

function buildReport(engine: NmsEngine): ReportRow[] {
  return NETWORKS.map((n) => {
    const s = engine.networkSummary(n);
    return {
      network: n,
      devices: s.totalDevices,
      online: s.online,
      offline: s.offline,
      avgLatency: s.avgLatency === null ? "—" : `${s.avgLatency}`,
      avgLoss: `${s.avgPacketLoss}`,
      avgUptime: `${s.avgUptime}`,
      bwIn: `${s.totalBandwidthIn}`,
      bwOut: `${s.totalBandwidthOut}`,
      alerts: s.activeAlerts,
      health: s.healthScore,
    };
  });
}

const HEADERS = [
  "Network",
  "Devices",
  "Online",
  "Offline",
  "Avg Latency (ms)",
  "Avg Packet Loss (%)",
  "Avg Uptime (%)",
  "Bandwidth In (Mbps)",
  "Bandwidth Out (Mbps)",
  "Active Alerts",
  "Health Score",
];

function rowsToAoa(rows: ReportRow[]): (string | number)[][] {
  return rows.map((r) => [
    r.network,
    r.devices,
    r.online,
    r.offline,
    r.avgLatency,
    r.avgLoss,
    r.avgUptime,
    r.bwIn,
    r.bwOut,
    r.alerts,
    r.health,
  ]);
}

function periodLabel(period: Period, from: string, to: string): string {
  const now = new Date();
  switch (period) {
    case "daily":
      return `Daily Report — ${now.toLocaleDateString()}`;
    case "weekly":
      return `Weekly Report — week of ${new Date(now.getTime() - 6 * 86400000).toLocaleDateString()}`;
    case "monthly":
      return `Monthly Report — ${now.toLocaleString(undefined, { month: "long", year: "numeric" })}`;
    case "custom":
      return `Custom Report — ${from || "?"} → ${to || "?"}`;
  }
}

function ReportsPage() {
  const { engine, version } = useNms();
  const [period, setPeriod] = useState<Period>("daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  void version;

  const rows = useMemo(() => (engine ? buildReport(engine) : []), [engine, version]);
  const title = periodLabel(period, from, to);

  const exportCsv = () => {
    const csv = [HEADERS.join(","), ...rowsToAoa(rows).map((r) => r.join(","))].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), `nms-report-${period}.csv`);
    toast.success("CSV report downloaded.");
  };

  const exportXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([[title], HEADERS, ...rowsToAoa(rows)]);
    ws["!cols"] = HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Network Report");
    XLSX.writeFile(wb, `nms-report-${period}.xlsx`);
    toast.success("Excel report downloaded.");
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("NetPulse NMS — Network Performance Report", 14, 16);
    doc.setFontSize(10);
    doc.text(title, 14, 23);
    doc.text(`Generated: ${fmtDateTime(Date.now())}`, 14, 28);
    autoTable(doc, {
      head: [HEADERS],
      body: rowsToAoa(rows),
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [24, 40, 60] },
    });
    doc.save(`nms-report-${period}.pdf`);
    toast.success("PDF report downloaded.");
  };

  if (!engine) return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate performance reporting per network with export
        </p>
      </div>

      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Report period</p>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-40 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">From</p>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-40 bg-background/50"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">To</p>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-40 bg-background/50"
              />
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportPdf}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportXlsx}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <CalendarRange className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {HEADERS.map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.network} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-medium">{r.network}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.devices}</td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--success)" }}>
                    {r.online}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: r.offline > 0 ? "var(--destructive)" : undefined }}>
                    {r.offline}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.avgLatency}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.avgLoss}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.avgUptime}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.bwIn}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.bwOut}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.alerts}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border p-3 font-mono text-[11px] text-muted-foreground">
          Snapshot generated {fmtDateTime(Date.now())} · values aggregated from the current
          monitoring window
        </p>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
