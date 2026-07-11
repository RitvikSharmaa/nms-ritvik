import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { DeviceRow } from "./DeviceTable";
import { useNms, useNow } from "@/lib/nms/useNms";
import { fmtDateTime, fmtMbps, fmtMs, fmtPct, timeAgo } from "@/lib/nms/format";
import { HealthBar, LinkBadges, StatusBadge } from "./badges";
import { TrendChart } from "./TrendChart";

export function DeviceDrawer({
  row,
  onClose,
}: {
  row: DeviceRow | null;
  onClose: () => void;
}) {
  const { engine, version } = useNms();
  const now = useNow(5000);
  void version;

  const device = row?.device;
  const live = device && engine ? engine.metrics.get(device.id) : undefined;
  const history = device && engine ? (engine.history.get(device.id) ?? []) : [];
  const chartData = history.slice(-80).map((p) => ({
    t: p.t,
    latency: p.latency ?? 0,
    packetLoss: p.packetLoss,
    bandwidthIn: p.bandwidthIn,
    bandwidthOut: p.bandwidthOut,
  }));

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-xl">
        {device && live && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between pr-6 font-display">
                <span>{device.deviceName}</span>
                <StatusBadge status={live.status} pulse />
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-8">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Hostname" value={device.hostname} mono />
                <Field label="IP Address" value={device.ip} mono />
                <Field label="Network" value={device.network} />
                <Field label="Owner" value={device.username} />
                <Field label="Vendor" value={device.vendor} />
                <Field label="Model" value={device.model} />
                <Field label="MAC Address" value={device.mac} mono />
                <Field label="Registered" value={fmtDateTime(device.createdAt)} />
                <div className="col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Assigned Links
                  </p>
                  <div className="mt-1">
                    <LinkBadges links={device.links} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-3">
                <Stat label="Latency" value={fmtMs(live.latency)} />
                <Stat label="Packet Loss" value={fmtPct(live.packetLoss)} />
                <Stat label="Uptime" value={fmtPct(live.uptimePct, 2)} />
                <Stat label="BW In" value={fmtMbps(live.bandwidthIn)} />
                <Stat label="BW Out" value={fmtMbps(live.bandwidthOut)} />
                <div className="glass-panel rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Health
                  </p>
                  <div className="mt-1.5">
                    <HealthBar score={live.healthScore} />
                  </div>
                </div>
              </div>

              <p className="font-mono text-xs text-muted-foreground">
                Last poll {timeAgo(live.lastPoll, now)} · {fmtDateTime(live.lastPoll)}
              </p>

              <Separator />

              <div>
                <h4 className="mb-2 text-sm font-semibold">Latency History</h4>
                <TrendChart
                  data={chartData}
                  series={[{ key: "latency", label: "Latency", color: "var(--chart-1)" }]}
                  unit=" ms"
                  height={160}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Bandwidth History</h4>
                <TrendChart
                  data={chartData}
                  series={[
                    { key: "bandwidthIn", label: "In", color: "var(--chart-2)" },
                    { key: "bandwidthOut", label: "Out", color: "var(--chart-4)" },
                  ]}
                  unit=" Mbps"
                  height={160}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Packet Loss History</h4>
                <TrendChart
                  data={chartData}
                  series={[{ key: "packetLoss", label: "Loss", color: "var(--chart-5)" }]}
                  unit="%"
                  height={140}
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={mono ? "mt-0.5 truncate font-mono text-xs" : "mt-0.5 truncate text-sm"}>
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}
