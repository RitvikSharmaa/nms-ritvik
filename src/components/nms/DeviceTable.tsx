import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Device, DeviceStatus, LiveMetrics } from "@/lib/nms/types";
import { fmtMbps, fmtMs, fmtPct, timeAgo } from "@/lib/nms/format";
import { useNow } from "@/lib/nms/useNms";
import { HealthBar, LinkBadges, StatusBadge } from "./badges";
import { cn } from "@/lib/utils";

export interface DeviceRow {
  device: Device;
  metrics: LiveMetrics;
}

type SortKey =
  | "status"
  | "hostname"
  | "ip"
  | "deviceName"
  | "latency"
  | "packetLoss"
  | "bandwidthIn"
  | "bandwidthOut"
  | "uptimePct"
  | "healthScore"
  | "lastPoll";

const PAGE_SIZE = 10;

const STATUS_ORDER: Record<DeviceStatus, number> = { down: 0, degraded: 1, up: 2 };

function sortValue(row: DeviceRow, key: SortKey): string | number {
  switch (key) {
    case "status":
      return STATUS_ORDER[row.metrics.status];
    case "hostname":
      return row.device.hostname;
    case "ip":
      return row.device.ip.split(".").map((p) => p.padStart(3, "0")).join(".");
    case "deviceName":
      return row.device.deviceName;
    case "latency":
      return row.metrics.latency ?? Number.POSITIVE_INFINITY;
    default:
      return row.metrics[key];
  }
}

export function DeviceTable({
  rows,
  showNetwork,
  onSelect,
}: {
  rows: DeviceRow[];
  showNetwork?: boolean;
  onSelect: (row: DeviceRow) => void;
}) {
  const now = useNow(5000);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.device.hostname.toLowerCase().includes(q) ||
          r.device.deviceName.toLowerCase().includes(q) ||
          r.device.ip.includes(q) ||
          r.device.username.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") out = out.filter((r) => r.metrics.status === statusFilter);
    if (linkFilter !== "all")
      out = out.filter((r) => (r.device.links as string[]).includes(linkFilter));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string")
        return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, search, statusFilter, linkFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const Th = ({ label, k, className }: { label: string; k?: SortKey; className?: string }) => (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        k && "cursor-pointer select-none hover:text-foreground",
        className,
      )}
      onClick={k ? () => toggleSort(k) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {k &&
          (sortKey === k ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          ))}
      </span>
    </th>
  );

  return (
    <div className="glass-panel rounded-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hostname, IP, device, username…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-9 border-input bg-background/50 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-36 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="up">Online</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="down">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkFilter} onValueChange={(v) => { setLinkFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-32 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All links</SelectItem>
            <SelectItem value="Link-1">Link-1</SelectItem>
            <SelectItem value="Link-2">Link-2</SelectItem>
            <SelectItem value="Link-3">Link-3</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} devices
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <Th label="Status" k="status" />
              <Th label="Hostname" k="hostname" />
              <Th label="IP Address" k="ip" />
              <Th label="Device Name" k="deviceName" />
              <Th label="Links" />
              {showNetwork && <Th label="Network" />}
              <Th label="Latency" k="latency" />
              <Th label="Loss" k="packetLoss" />
              <Th label="BW In" k="bandwidthIn" />
              <Th label="BW Out" k="bandwidthOut" />
              <Th label="Uptime" k="uptimePct" />
              <Th label="Health" k="healthScore" />
              <Th label="Last Poll" k="lastPoll" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ device, metrics }) => (
              <tr
                key={device.id}
                onClick={() => onSelect({ device, metrics })}
                className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/40"
              >
                <td className="px-3 py-2.5">
                  <StatusBadge status={metrics.status} pulse />
                </td>
                <td className="max-w-52 truncate px-3 py-2.5 font-mono text-xs text-foreground/90">
                  {device.hostname}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{device.ip}</td>
                <td className="px-3 py-2.5">{device.deviceName}</td>
                <td className="px-3 py-2.5">
                  <LinkBadges links={device.links} />
                </td>
                {showNetwork && (
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{device.network}</td>
                )}
                <td className="px-3 py-2.5 font-mono text-xs">{fmtMs(metrics.latency)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtPct(metrics.packetLoss)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtMbps(metrics.bandwidthIn)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtMbps(metrics.bandwidthOut)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{fmtPct(metrics.uptimePct, 2)}</td>
                <td className="px-3 py-2.5">
                  <HealthBar score={metrics.healthScore} />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                  {timeAgo(metrics.lastPoll, now)}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No devices match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3">
        <span className="font-mono text-xs text-muted-foreground">
          Page {safePage + 1} / {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
