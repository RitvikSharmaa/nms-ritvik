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

const ALL_LINKS: LinkName[] = ["Link-1", "Link-2", "Link-3"];

export type LinkOpState = "up" | "down" | "na";

/**
 * Derive per-link operational state from device assignment + overall status.
 * - Not assigned → N/A
 * - Device down → all assigned links DOWN
 * - Device degraded → first assigned link DOWN, others UP
 * - Device up → all assigned UP
 */
export function deriveLinkStates(
  assigned: LinkName[],
  status: DeviceStatus,
): Record<LinkName, LinkOpState> {
  const set = new Set(assigned);
  const firstAssigned = ALL_LINKS.find((l) => set.has(l));
  const out = {} as Record<LinkName, LinkOpState>;
  for (const l of ALL_LINKS) {
    if (!set.has(l)) {
      out[l] = "na";
    } else if (status === "down") {
      out[l] = "down";
    } else if (status === "degraded" && l === firstAssigned) {
      out[l] = "down";
    } else {
      out[l] = "up";
    }
  }
  return out;
}

const LINK_TONE: Record<LinkOpState, { dot: string; text: string; label: string; bg: string; border: string }> = {
  up: {
    dot: "var(--success)",
    text: "var(--success)",
    label: "UP",
    bg: "color-mix(in oklab, var(--success) 10%, transparent)",
    border: "color-mix(in oklab, var(--success) 35%, transparent)",
  },
  down: {
    dot: "var(--destructive)",
    text: "var(--destructive)",
    label: "DOWN",
    bg: "color-mix(in oklab, var(--destructive) 12%, transparent)",
    border: "color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
  na: {
    dot: "var(--muted-foreground)",
    text: "var(--muted-foreground)",
    label: "N/A",
    bg: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)",
    border: "color-mix(in oklab, var(--muted-foreground) 25%, transparent)",
  },
};

export function LinkStatusMatrix({
  assigned,
  status,
}: {
  assigned: LinkName[];
  status: DeviceStatus;
}) {
  const states = deriveLinkStates(assigned, status);
  return (
    <table className="w-[112px] border-separate border-spacing-0 overflow-hidden rounded-md border border-border/70 font-mono text-[10px]">
      <tbody>
        {ALL_LINKS.map((l, i) => {
          const s = states[l];
          const tone = LINK_TONE[s];
          return (
            <tr
              key={l}
              className={cn(
                "transition-colors hover:bg-accent/60",
                i > 0 && "border-t border-border/60",
              )}
              style={{ backgroundColor: tone.bg }}
            >
              <td
                className="w-[46px] px-1.5 py-0.5 text-foreground/85"
                style={{ borderTop: i > 0 ? `1px solid ${tone.border}` : undefined }}
              >
                {l.replace("Link-", "L")}
              </td>
              <td
                className="px-1.5 py-0.5 text-right"
                style={{
                  color: tone.text,
                  borderTop: i > 0 ? `1px solid ${tone.border}` : undefined,
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: tone.dot,
                      boxShadow: s !== "na" ? `0 0 6px ${tone.dot}` : undefined,
                    }}
                  />
                  <span className="font-semibold tracking-wider">{tone.label}</span>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
