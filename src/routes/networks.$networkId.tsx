import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Activity, AlertTriangle, ArrowDownUp, Clock, Gauge, Server, Wifi } from "lucide-react";
import { KpiCard } from "@/components/nms/KpiCard";
import { TrendChart } from "@/components/nms/TrendChart";
import { DeviceTable, type DeviceRow } from "@/components/nms/DeviceTable";
import { DeviceDrawer } from "@/components/nms/DeviceDrawer";
import { useNms } from "@/lib/nms/useNms";
import { isNetworkName } from "@/lib/nms/constants";
import { fmtMbps, fmtMs, fmtPct } from "@/lib/nms/format";
import type { NetworkName } from "@/lib/nms/types";

export const Route = createFileRoute("/networks/$networkId")({
  loader: ({ params }) => {
    if (!isNetworkName(params.networkId)) throw notFound();
    return { networkId: params.networkId as NetworkName };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.networkId} — NetPulse NMS` },
      {
        name: "description",
        content: `Live device monitoring for ${params.networkId}: status, latency, packet loss, bandwidth and health scores.`,
      },
      { property: "og:title", content: `${params.networkId} — NetPulse NMS` },
      {
        property: "og:description",
        content: `Real-time monitoring of all devices in ${params.networkId}.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="font-display text-xl font-semibold">Network not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Only Network-1 through Network-5 exist in this system.
      </p>
    </div>
  ),
  component: NetworkPage,
});

function NetworkPage() {
  const { networkId } = Route.useLoaderData();
  const { engine, version } = useNms();
  const [selected, setSelected] = useState<DeviceRow | null>(null);
  void version;

  if (!engine) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted/60" />
      </div>
    );
  }

  const s = engine.networkSummary(networkId);
  const trend = engine.trendSeries(networkId, 80);
  const rows: DeviceRow[] = engine
    .devicesByNetwork(networkId)
    .map((d) => ({ device: d, metrics: engine.metrics.get(d.id)! }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{networkId}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {s.totalDevices} devices · network health score {s.healthScore}/100
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard title="Devices" value={String(s.totalDevices)} icon={Server} />
        <KpiCard title="Online" value={String(s.online)} icon={Wifi} tone="success" sub={`${s.degraded} degraded · ${s.offline} down`} />
        <KpiCard title="Avg Latency" value={fmtMs(s.avgLatency)} icon={Gauge} />
        <KpiCard title="Packet Loss" value={fmtPct(s.avgPacketLoss)} icon={Activity} tone={s.avgPacketLoss > 2 ? "warning" : "default"} />
        <KpiCard title="Avg Uptime" value={fmtPct(s.avgUptime, 2)} icon={Clock} tone="success" />
        <KpiCard title="Bandwidth" value={fmtMbps(s.totalBandwidthIn + s.totalBandwidthOut)} icon={ArrowDownUp} tone="info" sub={`↓ ${fmtMbps(s.totalBandwidthIn)} · ↑ ${fmtMbps(s.totalBandwidthOut)}`} />
        <KpiCard title="Active Alerts" value={String(s.activeAlerts)} icon={AlertTriangle} tone={s.activeAlerts > 0 ? "warning" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">Latency Trend</h3>
          <TrendChart data={trend} series={[{ key: "latency", label: "Latency", color: "var(--chart-1)" }]} unit=" ms" height={180} />
        </div>
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">Bandwidth Trend</h3>
          <TrendChart
            data={trend}
            series={[
              { key: "bandwidthIn", label: "In", color: "var(--chart-2)" },
              { key: "bandwidthOut", label: "Out", color: "var(--chart-4)" },
            ]}
            unit=" Mbps"
            height={180}
          />
        </div>
      </div>

      <DeviceTable rows={rows} onSelect={setSelected} />
      <DeviceDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
