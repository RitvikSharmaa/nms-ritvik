import type { LinkName, NetworkName, NmsSettings } from "./types";

export const NETWORKS: NetworkName[] = [
  "Network-1",
  "Network-2",
  "Network-3",
  "Network-4",
  "Network-5",
];

export const LINKS: LinkName[] = ["Link-1", "Link-2", "Link-3"];

export const DEFAULT_SETTINGS: NmsSettings = {
  pollIntervalSec: 30,
  latencyWarnMs: 80,
  latencyCritMs: 150,
  packetLossWarnPct: 2,
  packetLossCritPct: 10,
  bandwidthWarnMbps: 850,
  snmpCommunity: "public",
  snmpVersion: "v2c",
  retentionDays: 90,
};

export const NETWORK_COLORS: Record<NetworkName, string> = {
  "Network-1": "var(--chart-1)",
  "Network-2": "var(--chart-2)",
  "Network-3": "var(--chart-3)",
  "Network-4": "var(--chart-4)",
  "Network-5": "var(--chart-5)",
};

export function isNetworkName(v: string): v is NetworkName {
  return (NETWORKS as string[]).includes(v);
}

export function isLinkName(v: string): v is LinkName {
  return (LINKS as string[]).includes(v);
}

export const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const IPV6_RE =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|::)$/;

export function isValidIp(v: string): boolean {
  return IPV4_RE.test(v) || IPV6_RE.test(v);
}
