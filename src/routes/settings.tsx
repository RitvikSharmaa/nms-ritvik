import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useNms } from "@/lib/nms/useNms";
import type { NmsSettings } from "@/lib/nms/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Setu" },
      {
        name: "description",
        content:
          "Configure monitoring thresholds, polling interval, SNMP parameters and data retention.",
      },
      { property: "og:title", content: "Settings — Setu" },
      { property: "og:description", content: "Monitoring engine configuration." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { engine, version } = useNms();
  const [form, setForm] = useState<NmsSettings | null>(null);
  void version;

  useEffect(() => {
    if (engine && !form) setForm({ ...engine.settings });
  }, [engine, form]);

  if (!engine || !form) return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;

  const num =
    (key: keyof NmsSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: Number(e.target.value) });

  const save = () => {
    engine.updateSettings(form);
    toast.success("Settings saved. Monitoring engine reconfigured.");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoring engine thresholds and polling configuration
        </p>
      </div>

      <div className="glass-panel space-y-6 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Polling</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldNum label="Poll interval (seconds)" value={form.pollIntervalSec} onChange={num("pollIntervalSec")} min={5} />
          <FieldNum label="Metric retention (days)" value={form.retentionDays} onChange={num("retentionDays")} min={1} />
        </div>

        <Separator />

        <h3 className="font-display text-sm font-semibold">Latency Thresholds</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldNum label="Warning threshold (ms)" value={form.latencyWarnMs} onChange={num("latencyWarnMs")} min={1} />
          <FieldNum label="Critical threshold (ms)" value={form.latencyCritMs} onChange={num("latencyCritMs")} min={1} />
        </div>

        <Separator />

        <h3 className="font-display text-sm font-semibold">Packet Loss Thresholds</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldNum label="Warning threshold (%)" value={form.packetLossWarnPct} onChange={num("packetLossWarnPct")} min={0} />
          <FieldNum label="Critical threshold (%)" value={form.packetLossCritPct} onChange={num("packetLossCritPct")} min={0} />
        </div>

        <Separator />

        <h3 className="font-display text-sm font-semibold">Bandwidth & SNMP</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldNum label="Bandwidth warning (Mbps)" value={form.bandwidthWarnMbps} onChange={num("bandwidthWarnMbps")} min={1} />
          <div className="space-y-1.5">
            <Label className="text-xs">SNMP community</Label>
            <Input
              value={form.snmpCommunity}
              onChange={(e) => setForm({ ...form, snmpCommunity: e.target.value })}
              className="bg-background/50 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SNMP version</Label>
            <Select
              value={form.snmpVersion}
              onValueChange={(v) => setForm({ ...form, snmpVersion: v as NmsSettings["snmpVersion"] })}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v1">SNMP v1</SelectItem>
                <SelectItem value="v2c">SNMP v2c</SelectItem>
                <SelectItem value="v3">SNMP v3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} min={min} onChange={onChange} className="bg-background/50 font-mono" />
    </div>
  );
}
