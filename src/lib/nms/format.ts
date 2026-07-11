import type { AlertSeverity, DeviceStatus } from "./types";

export function fmtMs(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(1)} ms`;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(digits)}%`;
}

export function fmtMbps(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)} Gbps`;
  return `${Math.round(v)} Mbps`;
}

export function timeAgo(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const STATUS_LABEL: Record<DeviceStatus, string> = {
  up: "Online",
  degraded: "Degraded",
  down: "Offline",
};

export const STATUS_COLOR: Record<DeviceStatus, string> = {
  up: "var(--success)",
  degraded: "var(--warning)",
  down: "var(--destructive)",
};

export const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "var(--destructive)",
  warning: "var(--warning)",
  info: "var(--info)",
};

export function healthColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--destructive)";
}
