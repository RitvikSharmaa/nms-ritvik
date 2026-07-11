import type {
  Alert,
  AlertSeverity,
  AppUser,
  AuditLog,
  Device,
  DeviceStatus,
  GlobalSummary,
  ImportRow,
  LinkName,
  LiveMetrics,
  MetricPoint,
  NetworkName,
  NetworkSummary,
  NmsSettings,
} from "./types";
import { DEFAULT_SETTINGS, LINKS, NETWORKS } from "./constants";

/** Deterministic PRNG (mulberry32) so the simulated NOC is stable per session. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DeviceProfile {
  baseLatency: number;
  jitter: number;
  baseBwIn: number;
  baseBwOut: number;
  flapProb: number; // chance per tick to go down
  recoverProb: number; // chance per tick to come back up
  lossy: boolean;
}

const VENDORS: Array<{ vendor: string; models: string[] }> = [
  { vendor: "Cisco", models: ["Catalyst 9300", "ISR 4451", "Nexus 9336C", "ASR 1002-HX"] },
  { vendor: "Juniper", models: ["EX4650", "MX204", "SRX345", "QFX5120"] },
  { vendor: "Arista", models: ["7050X3", "7280R3", "720XP"] },
  { vendor: "Fortinet", models: ["FortiGate 600E", "FortiGate 200F"] },
  { vendor: "HPE Aruba", models: ["CX 6300M", "CX 8325", "AP-635"] },
  { vendor: "Dell EMC", models: ["S5248F-ON", "PowerEdge R750"] },
];

const DEVICE_KINDS = [
  "Core-Router",
  "Dist-Switch",
  "Access-Switch",
  "Firewall",
  "Server",
  "NAS",
  "WLC",
  "AP",
  "Printer",
  "IP-Camera",
];

const HISTORY_POINTS = 240; // kept per device

type Listener = () => void;

export class NmsEngine {
  devices = new Map<string, Device>();
  metrics = new Map<string, LiveMetrics>();
  history = new Map<string, MetricPoint[]>();
  alerts: Alert[] = [];
  users: AppUser[] = [];
  auditLogs: AuditLog[] = [];
  settings: NmsSettings = { ...DEFAULT_SETTINGS };

  private profiles = new Map<string, DeviceProfile>();
  private rng = mulberry32(0x5eed);
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private idCounter = 0;
  lastCycleAt = 0;

  constructor() {
    this.seedUsers();
    this.seedDevices();
    this.backfillHistory();
    this.startScheduler();
  }

  // ---------- subscription ----------
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private nextId(prefix: string) {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter.toString(36)}`;
  }

  // ---------- seeding ----------
  private seedUsers() {
    const now = Date.now();
    const mk = (
      username: string,
      fullName: string,
      role: AppUser["role"],
      daysAgo: number,
    ): AppUser => ({
      id: this.nextId("usr"),
      username,
      fullName,
      email: `${username}@corp.local`,
      role,
      active: true,
      lastLogin: now - daysAgo * 3_600_000,
      createdAt: now - 90 * 86_400_000,
    });
    this.users = [
      mk("admin", "System Administrator", "admin", 1),
      mk("noc.lead", "Priya Sharma", "admin", 3),
      mk("j.mathews", "John Mathews", "operator", 6),
      mk("a.khan", "Ayesha Khan", "operator", 12),
      mk("viewer1", "Ravi Patel", "viewer", 30),
    ];
  }

  private seedDevices() {
    const perNetwork = [14, 11, 12, 9, 10];
    NETWORKS.forEach((network, ni) => {
      for (let i = 0; i < perNetwork[ni]; i++) {
        const kind = DEVICE_KINDS[Math.floor(this.rng() * DEVICE_KINDS.length)];
        const v = VENDORS[Math.floor(this.rng() * VENDORS.length)];
        const model = v.models[Math.floor(this.rng() * v.models.length)];
        const idx = (i + 1).toString().padStart(2, "0");
        const ip = `10.${10 + ni}.${Math.floor(this.rng() * 4)}.${10 + i * 3 + Math.floor(this.rng() * 2)}`;
        const linkCount = 1 + Math.floor(this.rng() * 3);
        const shuffled = [...LINKS].sort(() => this.rng() - 0.5);
        const links = shuffled.slice(0, linkCount).sort() as LinkName[];
        const device: Device = {
          id: this.nextId("dev"),
          username: ["admin", "noc", "operator"][Math.floor(this.rng() * 3)],
          ip,
          deviceName: `${kind}-${idx}`,
          hostname: `${kind.toLowerCase()}-${idx}.n${ni + 1}.corp.local`,
          network,
          links,
          vendor: v.vendor,
          model,
          mac: this.randomMac(),
          createdAt: Date.now() - Math.floor(this.rng() * 200) * 86_400_000,
        };
        this.registerDevice(device);
      }
    });
  }

  private randomMac() {
    const h = () =>
      Math.floor(this.rng() * 256)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    return `00:1B:${h()}:${h()}:${h()}:${h()}`;
  }

  private registerDevice(device: Device) {
    this.devices.set(device.id, device);
    const isEdge = /AP|Printer|IP-Camera/.test(device.deviceName);
    this.profiles.set(device.id, {
      baseLatency: 4 + this.rng() * (isEdge ? 60 : 20),
      jitter: 1 + this.rng() * (isEdge ? 25 : 8),
      baseBwIn: 40 + this.rng() * (isEdge ? 120 : 700),
      baseBwOut: 25 + this.rng() * (isEdge ? 80 : 500),
      flapProb: this.rng() < 0.12 ? 0.05 : 0.006,
      recoverProb: 0.35,
      lossy: this.rng() < 0.15,
    });
    this.history.set(device.id, []);
    this.metrics.set(device.id, {
      deviceId: device.id,
      status: "up",
      latency: null,
      packetLoss: 0,
      bandwidthIn: 0,
      bandwidthOut: 0,
      uptimePct: 100,
      healthScore: 100,
      lastPoll: 0,
    });
  }

  private backfillHistory() {
    const interval = this.settings.pollIntervalSec * 1000;
    const start = Date.now() - HISTORY_POINTS * interval;
    for (let i = 0; i < HISTORY_POINTS; i++) {
      this.pollAll(start + i * interval, true);
    }
    this.pollAll(Date.now(), false);
  }

  // ---------- scheduler ----------
  startScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(
      () => {
        this.pollAll(Date.now(), false);
        this.emit();
      },
      Math.max(5, this.settings.pollIntervalSec) * 1000,
    );
  }

  // ---------- monitoring cycle ----------
  private pollAll(now: number, backfill: boolean) {
    this.lastCycleAt = now;
    for (const device of this.devices.values()) {
      this.pollDevice(device, now, backfill);
    }
    if (!backfill) this.autoResolveRecovered(now);
  }

  private pollDevice(device: Device, now: number, backfill: boolean) {
    const p = this.profiles.get(device.id)!;
    const m = this.metrics.get(device.id)!;
    const hist = this.history.get(device.id)!;

    // status transition
    let status: DeviceStatus = m.status;
    if (status === "down") {
      if (this.rng() < p.recoverProb) status = "up";
    } else if (this.rng() < p.flapProb) {
      status = "down";
    }

    let latency: number | null = null;
    let packetLoss = 100;
    let bwIn = 0;
    let bwOut = 0;

    if (status !== "down") {
      const hour = new Date(now).getHours();
      const dayFactor = 0.55 + 0.45 * Math.sin(((hour - 4) / 24) * Math.PI * 2) ** 2;
      const spike = this.rng() < 0.04 ? 1 + this.rng() * 3 : 1;
      latency = Math.max(0.4, p.baseLatency + (this.rng() - 0.4) * p.jitter * 2) * spike;
      packetLoss = p.lossy
        ? Math.max(0, (this.rng() - 0.55) * 20)
        : this.rng() < 0.06
          ? this.rng() * 3
          : 0;
      bwIn = Math.max(1, p.baseBwIn * dayFactor * (0.75 + this.rng() * 0.5));
      bwOut = Math.max(1, p.baseBwOut * dayFactor * (0.75 + this.rng() * 0.5));
      if (
        latency > this.settings.latencyCritMs ||
        packetLoss > this.settings.packetLossCritPct
      ) {
        status = "degraded";
      } else if (
        latency > this.settings.latencyWarnMs ||
        packetLoss > this.settings.packetLossWarnPct
      ) {
        status = "degraded";
      } else {
        status = "up";
      }
    }

    const point: MetricPoint = {
      t: now,
      latency: latency === null ? null : Math.round(latency * 10) / 10,
      packetLoss: Math.round(packetLoss * 10) / 10,
      bandwidthIn: Math.round(bwIn * 10) / 10,
      bandwidthOut: Math.round(bwOut * 10) / 10,
      status,
    };
    hist.push(point);
    if (hist.length > HISTORY_POINTS) hist.splice(0, hist.length - HISTORY_POINTS);

    const upCount = hist.filter((h) => h.status !== "down").length;
    const uptimePct = hist.length ? (upCount / hist.length) * 100 : 100;

    const health = this.computeHealth(point, uptimePct);

    const prevStatus = m.status;
    Object.assign(m, {
      status,
      latency: point.latency,
      packetLoss: point.packetLoss,
      bandwidthIn: point.bandwidthIn,
      bandwidthOut: point.bandwidthOut,
      uptimePct: Math.round(uptimePct * 100) / 100,
      healthScore: health,
      lastPoll: now,
    });

    if (!backfill) this.evaluateAlerts(device, m, prevStatus, now);
  }

  private computeHealth(p: MetricPoint, uptimePct: number): number {
    if (p.status === "down") return 0;
    let score = 100;
    if (p.latency !== null) {
      score -= Math.min(35, (p.latency / this.settings.latencyCritMs) * 25);
    }
    score -= Math.min(30, p.packetLoss * 2.5);
    score -= Math.min(20, (100 - uptimePct) * 2);
    return Math.max(1, Math.round(score));
  }

  // ---------- alerting ----------
  private evaluateAlerts(
    device: Device,
    m: LiveMetrics,
    prevStatus: DeviceStatus,
    now: number,
  ) {
    const s = this.settings;
    if (m.status === "down" && prevStatus !== "down") {
      this.raiseAlert(device, "critical", "device_down", `${device.deviceName} (${device.ip}) is unreachable — ICMP timeout`, now);
    }
    if (m.status !== "down" && prevStatus === "down") {
      this.raiseAlert(device, "info", "device_recovered", `${device.deviceName} (${device.ip}) recovered — responding to ICMP`, now);
    }
    if (m.latency !== null && m.latency > s.latencyCritMs) {
      this.raiseAlert(device, "critical", "high_latency", `Latency ${m.latency} ms exceeds critical threshold (${s.latencyCritMs} ms)`, now);
    } else if (m.latency !== null && m.latency > s.latencyWarnMs) {
      this.raiseAlert(device, "warning", "high_latency", `Latency ${m.latency} ms exceeds warning threshold (${s.latencyWarnMs} ms)`, now);
    }
    if (m.packetLoss > s.packetLossCritPct) {
      this.raiseAlert(device, "critical", "packet_loss", `Packet loss ${m.packetLoss}% exceeds critical threshold (${s.packetLossCritPct}%)`, now);
    } else if (m.packetLoss > s.packetLossWarnPct) {
      this.raiseAlert(device, "warning", "packet_loss", `Packet loss ${m.packetLoss}% exceeds warning threshold (${s.packetLossWarnPct}%)`, now);
    }
    if (m.bandwidthIn > s.bandwidthWarnMbps || m.bandwidthOut > s.bandwidthWarnMbps) {
      this.raiseAlert(device, "warning", "bandwidth_utilization", `Bandwidth ${Math.max(m.bandwidthIn, m.bandwidthOut)} Mbps exceeds ${s.bandwidthWarnMbps} Mbps`, now);
    }
  }

  private raiseAlert(
    device: Device,
    severity: AlertSeverity,
    type: Alert["type"],
    message: string,
    now: number,
  ) {
    // dedupe: keep one active alert per device+type
    const existing = this.alerts.find(
      (a) => a.deviceId === device.id && a.type === type && a.state !== "resolved",
    );
    if (existing) {
      existing.message = message;
      existing.severity = severity;
      existing.updatedAt = now;
      return;
    }
    this.alerts.unshift({
      id: this.nextId("alrt"),
      deviceId: device.id,
      deviceName: device.deviceName,
      ip: device.ip,
      network: device.network,
      severity,
      type,
      message,
      state: "active",
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    });
    if (this.alerts.length > 500) this.alerts.length = 500;
  }

  private autoResolveRecovered(now: number) {
    for (const a of this.alerts) {
      if (a.state === "resolved") continue;
      const m = this.metrics.get(a.deviceId);
      if (!m) continue;
      const cleared =
        (a.type === "device_down" && m.status !== "down") ||
        (a.type === "high_latency" &&
          (m.latency === null || m.latency <= this.settings.latencyWarnMs)) ||
        (a.type === "packet_loss" && m.packetLoss <= this.settings.packetLossWarnPct) ||
        (a.type === "bandwidth_utilization" &&
          m.bandwidthIn <= this.settings.bandwidthWarnMbps &&
          m.bandwidthOut <= this.settings.bandwidthWarnMbps);
      // auto-resolve info recoveries after 5 minutes
      const staleInfo = a.severity === "info" && now - a.createdAt > 5 * 60_000;
      if (cleared || staleInfo) {
        a.state = "resolved";
        a.resolvedAt = now;
        a.updatedAt = now;
      }
    }
  }

  // ---------- public mutations ----------
  acknowledgeAlert(id: string, username = "admin") {
    const a = this.alerts.find((x) => x.id === id);
    if (a && a.state === "active") {
      a.state = "acknowledged";
      a.updatedAt = Date.now();
      this.audit(username, "ALERT_ACKNOWLEDGE", a.deviceName, a.message);
      this.emit();
    }
  }

  resolveAlert(id: string, username = "admin") {
    const a = this.alerts.find((x) => x.id === id);
    if (a && a.state !== "resolved") {
      a.state = "resolved";
      a.resolvedAt = Date.now();
      a.updatedAt = Date.now();
      this.audit(username, "ALERT_RESOLVE", a.deviceName, a.message);
      this.emit();
    }
  }

  updateSettings(patch: Partial<NmsSettings>, username = "admin") {
    const prevInterval = this.settings.pollIntervalSec;
    this.settings = { ...this.settings, ...patch };
    if (this.settings.pollIntervalSec !== prevInterval) this.startScheduler();
    this.audit(username, "SETTINGS_UPDATE", "Monitoring settings", JSON.stringify(patch));
    this.emit();
  }

  importDevices(rows: ImportRow[], fileName: string, username = "admin"): number {
    const now = Date.now();
    let count = 0;
    for (const row of rows) {
      if (row.errors.length > 0 || !row.network) continue;
      const device: Device = {
        id: this.nextId("dev"),
        username: row.username,
        ip: row.ip,
        deviceName: row.deviceName,
        hostname: `${row.deviceName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.${row.network.toLowerCase()}.corp.local`,
        network: row.network,
        links: row.links,
        vendor: "Unknown",
        model: "—",
        mac: this.randomMac(),
        createdAt: now,
      };
      this.registerDevice(device);
      // give imported devices immediate history
      const interval = this.settings.pollIntervalSec * 1000;
      for (let i = 20; i > 0; i--) {
        this.pollDevice(device, now - i * interval, true);
      }
      count++;
    }
    if (count > 0) {
      this.audit(username, "DEVICE_IMPORT", fileName, `${count} devices imported`);
      this.emit();
    }
    return count;
  }

  addUser(u: Omit<AppUser, "id" | "createdAt" | "lastLogin">, actor = "admin") {
    this.users.push({ ...u, id: this.nextId("usr"), createdAt: Date.now(), lastLogin: null });
    this.audit(actor, "USER_CREATE", u.username, `role=${u.role}`);
    this.emit();
  }

  toggleUser(id: string, actor = "admin") {
    const u = this.users.find((x) => x.id === id);
    if (u) {
      u.active = !u.active;
      this.audit(actor, u.active ? "USER_ENABLE" : "USER_DISABLE", u.username, "");
      this.emit();
    }
  }

  updateUserRole(id: string, role: AppUser["role"], actor = "admin") {
    const u = this.users.find((x) => x.id === id);
    if (u) {
      u.role = role;
      this.audit(actor, "USER_ROLE_CHANGE", u.username, `role=${role}`);
      this.emit();
    }
  }

  private audit(username: string, action: string, target: string, details: string) {
    this.auditLogs.unshift({
      id: this.nextId("aud"),
      username,
      action,
      target,
      details,
      ipAddress: "10.0.0.15",
      timestamp: Date.now(),
    });
    if (this.auditLogs.length > 1000) this.auditLogs.length = 1000;
  }

  // ---------- selectors ----------
  devicesByNetwork(network: NetworkName): Device[] {
    return [...this.devices.values()].filter((d) => d.network === network);
  }

  hasIp(ip: string): boolean {
    return [...this.devices.values()].some((d) => d.ip === ip);
  }

  hasDeviceName(name: string, network: NetworkName): boolean {
    return [...this.devices.values()].some(
      (d) => d.network === network && d.deviceName.toLowerCase() === name.toLowerCase(),
    );
  }

  networkSummary(network: NetworkName): NetworkSummary {
    const devices = this.devicesByNetwork(network);
    const ms = devices.map((d) => this.metrics.get(d.id)!);
    const up = ms.filter((m) => m.status === "up").length;
    const degraded = ms.filter((m) => m.status === "degraded").length;
    const down = ms.filter((m) => m.status === "down").length;
    const latencies = ms.filter((m) => m.latency !== null).map((m) => m.latency!);
    const avgLatency = latencies.length
      ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
      : null;
    const avgLoss = ms.length
      ? Math.round((ms.reduce((a, m) => a + m.packetLoss, 0) / ms.length) * 10) / 10
      : 0;
    const avgUptime = ms.length
      ? Math.round((ms.reduce((a, m) => a + m.uptimePct, 0) / ms.length) * 100) / 100
      : 100;
    const health = ms.length
      ? Math.round(ms.reduce((a, m) => a + m.healthScore, 0) / ms.length)
      : 100;
    return {
      network,
      totalDevices: devices.length,
      online: up,
      degraded,
      offline: down,
      avgLatency,
      avgPacketLoss: avgLoss,
      avgUptime,
      totalBandwidthIn: Math.round(ms.reduce((a, m) => a + m.bandwidthIn, 0)),
      totalBandwidthOut: Math.round(ms.reduce((a, m) => a + m.bandwidthOut, 0)),
      activeAlerts: this.alerts.filter((a) => a.network === network && a.state !== "resolved").length,
      healthScore: health,
    };
  }

  globalSummary(): GlobalSummary {
    const ms = [...this.metrics.values()];
    const latencies = ms.filter((m) => m.latency !== null).map((m) => m.latency!);
    return {
      totalDevices: this.devices.size,
      online: ms.filter((m) => m.status === "up").length,
      degraded: ms.filter((m) => m.status === "degraded").length,
      offline: ms.filter((m) => m.status === "down").length,
      avgLatency: latencies.length
        ? Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10
        : null,
      avgPacketLoss: ms.length
        ? Math.round((ms.reduce((a, m) => a + m.packetLoss, 0) / ms.length) * 10) / 10
        : 0,
      avgUptime: ms.length
        ? Math.round((ms.reduce((a, m) => a + m.uptimePct, 0) / ms.length) * 100) / 100
        : 100,
      totalBandwidthIn: Math.round(ms.reduce((a, m) => a + m.bandwidthIn, 0)),
      totalBandwidthOut: Math.round(ms.reduce((a, m) => a + m.bandwidthOut, 0)),
      activeAlerts: this.alerts.filter((a) => a.state !== "resolved").length,
      criticalAlerts: this.alerts.filter((a) => a.state !== "resolved" && a.severity === "critical").length,
    };
  }

  /** Aggregated trend across all devices (or one network) using history buckets. */
  trendSeries(network?: NetworkName, points = 60) {
    const devices = network
      ? this.devicesByNetwork(network)
      : [...this.devices.values()];
    if (devices.length === 0) return [];
    const ref = this.history.get(devices[0].id) ?? [];
    const len = Math.min(points, ref.length);
    const out: Array<{
      t: number;
      latency: number;
      packetLoss: number;
      bandwidthIn: number;
      bandwidthOut: number;
    }> = [];
    for (let i = ref.length - len; i < ref.length; i++) {
      let lat = 0;
      let latN = 0;
      let loss = 0;
      let bin = 0;
      let bout = 0;
      let n = 0;
      for (const d of devices) {
        const h = this.history.get(d.id);
        const p = h?.[i - (ref.length - (h?.length ?? 0))] ?? h?.[i];
        if (!p) continue;
        if (p.latency !== null) {
          lat += p.latency;
          latN++;
        }
        loss += p.packetLoss;
        bin += p.bandwidthIn;
        bout += p.bandwidthOut;
        n++;
      }
      if (n === 0) continue;
      out.push({
        t: ref[i].t,
        latency: latN ? Math.round((lat / latN) * 10) / 10 : 0,
        packetLoss: Math.round((loss / n) * 10) / 10,
        bandwidthIn: Math.round(bin),
        bandwidthOut: Math.round(bout),
      });
    }
    return out;
  }
}

let engineSingleton: NmsEngine | null = null;

export function getEngine(): NmsEngine {
  if (!engineSingleton) engineSingleton = new NmsEngine();
  return engineSingleton;
}
