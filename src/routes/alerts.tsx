import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/nms/KpiCard";
import { AlertStateBadge, SeverityBadge } from "@/components/nms/badges";
import { useNms, useNow } from "@/lib/nms/useNms";
import { fmtDateTime, timeAgo } from "@/lib/nms/format";
import { NETWORKS } from "@/lib/nms/constants";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Setu" },
      {
        name: "description",
        content:
          "Alert management console: critical, warning and informational alerts with acknowledgement and resolution workflow.",
      },
      { property: "og:title", content: "Alerts — Setu" },
      { property: "og:description", content: "Live alert stream across all monitored networks." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { engine, version } = useNms();
  const now = useNow(5000);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [network, setNetwork] = useState("all");
  const [stateFilter, setStateFilter] = useState("unresolved");
  void version;

  const alerts = engine?.alerts ?? [];

  const counts = useMemo(() => {
    const active = alerts.filter((a) => a.state !== "resolved");
    return {
      critical: active.filter((a) => a.severity === "critical").length,
      warning: active.filter((a) => a.severity === "warning").length,
      info: active.filter((a) => a.severity === "info").length,
      resolved: alerts.filter((a) => a.state === "resolved").length,
    };
  }, [alerts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (severity !== "all" && a.severity !== severity) return false;
      if (network !== "all" && a.network !== network) return false;
      if (stateFilter === "unresolved" && a.state === "resolved") return false;
      if (stateFilter !== "all" && stateFilter !== "unresolved" && a.state !== stateFilter)
        return false;
      if (
        q &&
        !a.message.toLowerCase().includes(q) &&
        !a.deviceName.toLowerCase().includes(q) &&
        !a.ip.includes(q)
      )
        return false;
      return true;
    });
  }, [alerts, search, severity, network, stateFilter]);

  if (!engine) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Threshold breaches and availability events across all networks
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Critical" value={String(counts.critical)} icon={AlertOctagon} tone="destructive" />
        <KpiCard title="Warning" value={String(counts.warning)} icon={AlertTriangle} tone="warning" />
        <KpiCard title="Information" value={String(counts.info)} icon={Info} tone="info" />
        <KpiCard title="Resolved" value={String(counts.resolved)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="glass-panel rounded-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search message, device, IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-input bg-background/50 pl-8"
            />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 w-36 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="h-9 w-36 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All networks</SelectItem>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="h-9 w-36 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {filtered.length} alerts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">Severity</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5">Message</th>
                <th className="px-3 py-2.5">Device</th>
                <th className="px-3 py-2.5">Network</th>
                <th className="px-3 py-2.5">Raised</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <SeverityBadge severity={a.severity} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AlertStateBadge state={a.state} />
                  </td>
                  <td className="max-w-md px-3 py-2.5">
                    <p className="truncate text-xs text-foreground/90">{a.message}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs">{a.deviceName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{a.ip}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.network}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-[11px]">{timeAgo(a.createdAt, now)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {fmtDateTime(a.createdAt)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      {a.state === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => engine.acknowledgeAlert(a.id)}
                        >
                          Ack
                        </Button>
                      )}
                      {a.state !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => engine.resolveAlert(a.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No alerts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
