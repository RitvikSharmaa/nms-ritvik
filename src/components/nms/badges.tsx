import { Badge } from "@/components/ui/badge";
import type { AlertSeverity, AlertState, DeviceStatus, LinkName } from "@/lib/nms/types";
import { STATUS_COLOR, STATUS_LABEL, SEVERITY_COLOR } from "@/lib/nms/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, pulse }: { status: DeviceStatus; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className={cn("status-dot", pulse && status !== "down" && "pulse-live")}
        style={{ backgroundColor: STATUS_COLOR[status], boxShadow: `0 0 8px ${STATUS_COLOR[status]}` }}
      />
      <span className="text-foreground/90">{STATUS_LABEL[status]}</span>
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const c = SEVERITY_COLOR[severity];
  return (
    <Badge
      variant="outline"
      className="font-mono text-[11px] uppercase tracking-wider"
      style={{ color: c, borderColor: `color-mix(in oklab, ${c} 50%, transparent)`, background: `color-mix(in oklab, ${c} 12%, transparent)` }}
    >
      {severity}
    </Badge>
  );
}

export function AlertStateBadge({ state }: { state: AlertState }) {
  const map: Record<AlertState, { label: string; c: string }> = {
    active: { label: "Active", c: "var(--destructive)" },
    acknowledged: { label: "Acked", c: "var(--warning)" },
    resolved: { label: "Resolved", c: "var(--success)" },
  };
  const { label, c } = map[state];
  return (
    <Badge
      variant="outline"
      className="text-[11px]"
      style={{ color: c, borderColor: `color-mix(in oklab, ${c} 45%, transparent)` }}
    >
      {label}
    </Badge>
  );
}

export function LinkBadges({ links }: { links: LinkName[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {links.map((l) => (
        <Badge key={l} variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
          {l}
        </Badge>
      ))}
    </span>
  );
}

export function HealthBar({ score }: { score: number }) {
  const c =
    score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--destructive)";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: c }}
        />
      </span>
      <span className="font-mono text-xs" style={{ color: c }}>
        {score}
      </span>
    </span>
  );
}
