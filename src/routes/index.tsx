import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Clock,
  Gauge,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { KpiCard } from "@/components/nms/KpiCard";
import { TrendChart } from "@/components/nms/TrendChart";
import { SeverityBadge, StatusBadge } from "@/components/nms/badges";
import { DeviceDrawer } from "@/components/nms/DeviceDrawer";
import type { DeviceRow } from "@/components/nms/DeviceTable";
import { useNms, useNow } from "@/lib/nms/useNms";
import { fmtMbps, fmtMs, fmtPct, timeAgo } from "@/lib/nms/format";
import { NETWORKS } from "@/lib/nms/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOC Dashboard — NetPulse NMS" },
      {
        name: "description",
        content:
          "Global network operations dashboard: device availability, latency, packet loss, bandwidth and live alerts across all five networks.",
      },
      { property: "og:title", content: "NOC Dashboard — NetPulse NMS" },
      {
        property: "og:description",
        content: "Global network operations dashboard: device availability, latency, packet loss, bandwidth and live alerts across all five networks.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { engine, version } = useNms();
  const now = useNow(5000);
  const [selected, setSelected] = useState<DeviceRow | null>(null);
  void version;

  if (!engine) return <DashboardSkeleton />;

  const s = engine.globalSummary();
  const trend = engine.trendSeries(undefined, 80);
  const activeAlerts = engine.alerts.filter((a) => a.state !== "resolved").slice(0, 8);
  const problemDevices = [...engine.devices.values()]
    .map((d) => ({ device: d, metrics: engine.metrics.get(d.id)! }))
    .sort((a, b) => a.metrics.healthScore - b.metrics.healthScore)
    .slice(0, 6);
  const recentDevices = [...engine.devices.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6)
    .map((d) => ({ device: d, metrics: engine.metrics.get(d.id)! }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Network Operations Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live infrastructure health across all five networks · polling every{" "}
          {engine.settings.pollIntervalSec}s
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard title="Total Devices" value={String(s.totalDevices)} icon={Server} delay={0} />
        <KpiCard title="Online" value={String(s.online)} icon={Wifi} tone="success" delay={0.03} />
        <KpiCard title="Offline" value={String(s.offline)} icon={WifiOff} tone="destructive" sub={`${s.degraded} degraded`} delay={0.06} />
        <KpiCard title="Avg Latency" value={fmtMs(s.avgLatency)} icon={Gauge} delay={0.09} />
        <KpiCard title="Avg Packet Loss" value={fmtPct(s.avgPacketLoss)} icon={Activity} tone={s.avgPacketLoss > 2 ? "warning" : "default"} delay={0.12} />
        <KpiCard title="Avg Uptime" value={fmtPct(s.avgUptime, 2)} icon={Clock} tone="success" delay={0.15} />
        <KpiCard title="Bandwidth" value={fmtMbps(s.totalBandwidthIn + s.totalBandwidthOut)} icon={ArrowDownUp} tone="info" sub={`↓ ${fmtMbps(s.totalBandwidthIn)} · ↑ ${fmtMbps(s.totalBandwidthOut)}`} delay={0.18} />
        <KpiCard title="Active Alerts" value={String(s.activeAlerts)} icon={AlertTriangle} tone={s.criticalAlerts > 0 ? "destructive" : "warning"} sub={`${s.criticalAlerts} critical`} delay={0.21} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Latency Trend" sub="Average round-trip time (ms)">
          <TrendChart data={trend} series={[{ key: "latency", label: "Latency", color: "var(--chart-1)" }]} unit=" ms" />
        </ChartCard>
        <ChartCard title="Bandwidth Trend" sub="Aggregate throughput (Mbps)">
          <TrendChart
            data={trend}
            series={[
              { key: "bandwidthIn", label: "Inbound", color: "var(--chart-2)" },
              { key: "bandwidthOut", label: "Outbound", color: "var(--chart-4)" },
            ]}
            unit=" Mbps"
          />
        </ChartCard>
        <ChartCard title="Packet Loss Trend" sub="Average loss (%)">
          <TrendChart data={trend} series={[{ key: "packetLoss", label: "Loss", color: "var(--chart-5)" }]} unit="%" />
        </ChartCard>
      </div>

      {/* Network summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {NETWORKS.map((n, i) => {
          const ns = engine.networkSummary(n);
          return (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                to="/networks/$networkId"
                params={{ networkId: n }}
                className="glass-panel block rounded-xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-semibold">{n}</p>
                  <span
                    className="status-dot"
                    style={{
                      backgroundColor:
                        ns.offline > 0
                          ? "var(--destructive)"
                          : ns.degraded > 0
                            ? "var(--warning)"
                            : "var(--success)",
                    }}
                  />
                </div>
                <p className="mt-2 font-mono text-lg font-semibold text-primary">
                  {ns.online}/{ns.totalDevices}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">up</span>
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {fmtMs(ns.avgLatency)} · {fmtPct(ns.avgPacketLoss)} loss · health {ns.healthScore}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent alerts */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-3 font-display text-sm font-semibold">Recent Alerts</h3>
          <div className="space-y-2.5">
            {activeAlerts.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No active alerts.</p>
            )}
            {activeAlerts.map((a) => (
              <Link
                key={a.id}
                to="/alerts"
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-accent/40"
              >
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground/90">{a.message}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {a.deviceName} · {a.network} · {timeAgo(a.createdAt, now)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top problem devices */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-3 font-display text-sm font-semibold">Top Problem Devices</h3>
          <div className="space-y-1">
            {problemDevices.map((r) => (
              <button
                key={r.device.id}
                onClick={() => setSelected(r)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/40"
              >
                <StatusBadge status={r.metrics.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{r.device.deviceName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {r.device.ip} · {r.device.network}
                  </p>
                </div>
                <span
                  className="font-mono text-xs font-semibold"
                  style={{
                    color:
                      r.metrics.healthScore >= 80
                        ? "var(--success)"
                        : r.metrics.healthScore >= 50
                          ? "var(--warning)"
                          : "var(--destructive)",
                  }}
                >
                  {r.metrics.healthScore}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent devices */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-3 font-display text-sm font-semibold">Recently Added Devices</h3>
          <div className="space-y-1">
            {recentDevices.map((r) => (
              <button
                key={r.device.id}
                onClick={() => setSelected(r)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/40"
              >
                <StatusBadge status={r.metrics.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{r.device.deviceName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {r.device.ip} · {r.device.network}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {timeAgo(r.device.createdAt, now)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DeviceDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{sub}</p>
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
