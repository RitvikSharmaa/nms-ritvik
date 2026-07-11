export type DeviceStatus = "up" | "degraded" | "down";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertState = "active" | "acknowledged" | "resolved";

export const NETWORK_NAMES = [
  "Network-1",
  "Network-2",
  "Network-3",
  "Network-4",
  "Network-5",
] as const;
export type NetworkName = (typeof NETWORK_NAMES)[number];

export const LINK_NAMES = ["Link-1", "Link-2", "Link-3"] as const;
export type LinkName = (typeof LINK_NAMES)[number];

export interface DeviceRecord {
  id: string;
  username: string;
  ip_address: string;
  device_name: string;
  hostname: string;
  network_id: number;
  network_name: NetworkName;
  links: LinkName[];
  vendor: string;
  model: string;
  mac_address: string;
  created_at: string;
  updated_at: string;
}

export interface MetricRecord {
  id: string;
  device_id: string;
  network_id: number;
  status: DeviceStatus;
  latency_ms: number | null;
  packet_loss: number;
  bandwidth_in: number;
  bandwidth_out: number;
  polled_at: string;
}

export interface AlertRecord {
  id: string;
  device_id: string;
  device_name: string;
  ip_address: string;
  network_name: NetworkName;
  severity: AlertSeverity;
  type: string;
  message: string;
  state: AlertState;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SettingsRecord {
  poll_interval_sec: number;
  latency_warn_ms: number;
  latency_crit_ms: number;
  packet_loss_warn_pct: number;
  packet_loss_crit_pct: number;
  bandwidth_warn_mbps: number;
  snmp_community: string;
  snmp_version: string;
  retention_days: number;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface PollResult {
  deviceId: string;
  networkId: number;
  status: DeviceStatus;
  latencyMs: number | null;
  packetLoss: number;
  bandwidthInMbps: number;
  bandwidthOutMbps: number;
  snmpInOctets: number | null;
  snmpOutOctets: number | null;
}
