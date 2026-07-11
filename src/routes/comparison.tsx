import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trophy } from "lucide-react";
import { useNms } from "@/lib/nms/useNms";
import { NETWORKS, NETWORK_COLORS } from "@/lib/nms/constants";
import { fmtMbps, fmtMs, fmtPct } from "@/lib/nms/format";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Network Comparison — NetPulse NMS" },
      {
        name: "description",
        content:
          "Compare all five networks side by side: latency, bandwidth, packet loss, uptime and device counts with radar, bar and heatmap views.",
      },
      { property: "og:title", content: "Network Comparison — NetPulse NMS" },
      { property: "og:description", content: "Side-by-side performance comparison of five enterprise networks." },
    ],
  }),
  component: ComparisonPage,
});

function ComparisonPage() {
  const { engine, version } = useNms();
  void version;

  if (!engine) return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;

  const summaries = NETWORKS.map((n) => engine.networkSummary(n));

  // Radar: normalize each metric 0-100 (higher = better)
  const maxLatency = Math.max(...summaries.map((s) => s.avgLatency ?? 0), 1);
  const maxBw = Math.max(...summaries.map((s) => s.totalBandwidthIn + s.totalBandwidthOut), 1);
  const maxDevices = Math.max(...summaries.map((s) => s.totalDevices), 1);
  const radarData = [
    {
      metric: "Latency",
      ...Object.fromEntries(
        summaries.map((s) => [s.network, Math.round(100 - ((s.avgLatency ?? 0) / maxLatency) * 100)]),
      ),
    },
    {
      metric: "Packet Loss",
      ...Object.fromEntries(
        summaries.map((s) => [s.network, Math.round(Math.max(0, 100 - s.avgPacketLoss * 8))]),
      ),
    },
    {
      metric: "Uptime",
      ...Object.fromEntries(summaries.map((s) => [s.network, Math.round(s.avgUptime)])),
    },
    {
      metric: "Bandwidth",
      ...Object.fromEntries(
        summaries.map((s) => [
          s.network,
          Math.round(((s.totalBandwidthIn + s.totalBandwidthOut) / maxBw) * 100),
        ]),
      ),
    },
    {
      metric: "Availability",
      ...Object.fromEntries(
        summaries.map((s) => [
          s.network,
          s.totalDevices ? Math.round((s.online / s.totalDevices) * 100) : 100,
        ]),
      ),
    },
  ];

  const barData = summaries.map((s) => ({
    network: s.network.replace("Network-", "Net-"),
    latency: s.avgLatency ?? 0,
    packetLoss: s.avgPacketLoss,
    bandwidth: s.totalBandwidthIn + s.totalBandwidthOut,
    devices: s.totalDevices,
  }));

  // ranking: composite score
  const ranked = [...summaries].sort((a, b) => b.healthScore - a.healthScore);

  // heatmap values
  const heatMetrics: Array<{
    label: string;
    value: (s: (typeof summaries)[number]) => number;
    fmt: (v: number) => string;
    invert: boolean;
  }> = [
    { label: "Latency", value: (s) => s.avgLatency ?? 0, fmt: (v) => fmtMs(v), invert: true },
    { label: "Packet Loss", value: (s) => s.avgPacketLoss, fmt: (v) => fmtPct(v), invert: true },
    { label: "Uptime", value: (s) => s.avgUptime, fmt: (v) => fmtPct(v, 2), invert: false },
    { label: "Bandwidth", value: (s) => s.totalBandwidthIn + s.totalBandwidthOut, fmt: (v) => fmtMbps(v), invert: false },
    { label: "Health", value: (s) => s.healthScore, fmt: (v) => String(Math.round(v)), invert: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Network Comparison</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side performance across all five networks
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Radar */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">
            Performance Radar <span className="font-normal text-muted-foreground">(normalized, higher is better)</span>
          </h3>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {NETWORKS.map((n) => (
                <Radar
                  key={n}
                  name={n}
                  dataKey={n}
                  stroke={NETWORK_COLORS[n]}
                  fill={NETWORK_COLORS[n]}
                  fillOpacity={0.08}
                  strokeWidth={1.8}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bars */}
        <div className="space-y-4">
          <div className="glass-panel rounded-xl p-4">
            <h3 className="mb-2 font-display text-sm font-semibold">Average Latency (ms)</h3>
            <BarPanel data={barData} dataKey="latency" color="var(--chart-1)" />
          </div>
          <div className="glass-panel rounded-xl p-4">
            <h3 className="mb-2 font-display text-sm font-semibold">Total Bandwidth (Mbps)</h3>
            <BarPanel data={barData} dataKey="bandwidth" color="var(--chart-2)" />
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="mb-3 font-display text-sm font-semibold">Metric Heatmap</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  Metric
                </th>
                {NETWORKS.map((n) => (
                  <th key={n} className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatMetrics.map((hm) => {
                const values = summaries.map(hm.value);
                const min = Math.min(...values);
                const max = Math.max(...values);
                return (
                  <tr key={hm.label}>
                    <td className="px-3 py-2 text-xs font-medium">{hm.label}</td>
                    {summaries.map((s, i) => {
                      const v = values[i];
                      let ratio = max === min ? 0.5 : (v - min) / (max - min);
                      if (hm.invert) ratio = 1 - ratio;
                      const hue = ratio; // 0=bad 1=good
                      const bg = `color-mix(in oklab, ${
                        hue > 0.66 ? "var(--success)" : hue > 0.33 ? "var(--warning)" : "var(--destructive)"
                      } ${18 + hue * 10}%, transparent)`;
                      return (
                        <td key={s.network} className="px-3 py-2 text-center">
                          <span
                            className="inline-block min-w-24 rounded-md px-2 py-1.5 font-mono text-xs"
                            style={{ background: bg }}
                          >
                            {hm.fmt(v)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
          <Trophy className="h-4 w-4" style={{ color: "var(--warning)" }} />
          Network Ranking
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Network</th>
                <th className="px-3 py-2.5">Health</th>
                <th className="px-3 py-2.5">Devices</th>
                <th className="px-3 py-2.5">Online</th>
                <th className="px-3 py-2.5">Latency</th>
                <th className="px-3 py-2.5">Loss</th>
                <th className="px-3 py-2.5">Uptime</th>
                <th className="px-3 py-2.5">Bandwidth</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => (
                <tr key={s.network} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-mono text-sm font-semibold" style={{ color: i === 0 ? "var(--warning)" : undefined }}>
                    #{i + 1}
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NETWORK_COLORS[s.network] }} />
                    {s.network}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.healthScore}/100</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.totalDevices}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.online}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{fmtMs(s.avgLatency)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{fmtPct(s.avgPacketLoss)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{fmtPct(s.avgUptime, 2)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {fmtMbps(s.totalBandwidthIn + s.totalBandwidthOut)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BarPanel({
  data,
  dataKey,
  color,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="network" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
