export type LinkName = "Link-1" | "Link-2" | "Link-3";

export type NetworkName =
  | "Network-1"
  | "Network-2"
  | "Network-3"
  | "Network-4"
  | "Network-5";

export type DeviceStatus = "up" | "degraded" | "down";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertState = "active" | "acknowledged" | "resolved";

export type UserRole = "admin" | "operator" | "viewer";

export interface Device {
  id: string;
  username: string;
  ip: string;
  deviceName: string;
  hostname: string;
  network: NetworkName;
  links: LinkName[];
  vendor: string;
  model: string;
  mac: string;
  createdAt: number;
}

export interface MetricPoint {
  t: number;
  latency: number | null;
  packetLoss: number;
  bandwidthIn: number; // Mbps
  bandwidthOut: number; // Mbps
  status: DeviceStatus;
}

export interface LiveMetrics {
  deviceId: string;
  status: DeviceStatus;
  latency: number | null;
  packetLoss: number;
  bandwidthIn: number;
  bandwidthOut: number;
  uptimePct: number;
  healthScore: number;
  lastPoll: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  ip: string;
  network: NetworkName;
  severity: AlertSeverity;
  type:
    | "device_down"
    | "high_latency"
    | "packet_loss"
    | "bandwidth_utilization"
    | "device_recovered"
    | "device_imported";
  message: string;
  state: AlertState;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
}

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin: number | null;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  username: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  timestamp: number;
}

export interface NmsSettings {
  pollIntervalSec: number;
  latencyWarnMs: number;
  latencyCritMs: number;
  packetLossWarnPct: number;
  packetLossCritPct: number;
  bandwidthWarnMbps: number;
  snmpCommunity: string;
  snmpVersion: "v1" | "v2c" | "v3";
  retentionDays: number;
}

export interface ImportRow {
  rowNumber: number;
  username: string;
  ip: string;
  deviceName: string;
  linkRaw: string;
  networkRaw: string;
  links: LinkName[];
  network: NetworkName | null;
  errors: string[];
  duplicateOf?: "file" | "inventory";
}

export interface ImportReport {
  fileName: string;
  totalRows: number;
  valid: ImportRow[];
  invalid: ImportRow[];
  importedAt: number | null;
}

export interface NetworkSummary {
  network: NetworkName;
  totalDevices: number;
  online: number;
  degraded: number;
  offline: number;
  avgLatency: number | null;
  avgPacketLoss: number;
  avgUptime: number;
  totalBandwidthIn: number;
  totalBandwidthOut: number;
  activeAlerts: number;
  healthScore: number;
}

export interface GlobalSummary {
  totalDevices: number;
  online: number;
  degraded: number;
  offline: number;
  avgLatency: number | null;
  avgPacketLoss: number;
  avgUptime: number;
  totalBandwidthIn: number;
  totalBandwidthOut: number;
  activeAlerts: number;
  criticalAlerts: number;
}
