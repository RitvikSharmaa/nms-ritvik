import path from "path";
import { Worker } from "worker_threads";
import cron from "node-cron";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { query } from "../config/db";
import { deviceRepository } from "../repositories/device.repository";
import {
  alertRepository,
  metricRepository,
  settingsRepository,
} from "../repositories/monitoring.repository";
import { octetsToMbps } from "./snmp";
import type { RawProbeResult } from "./poll.worker";
import type { DeviceStatus, PollResult, SettingsRecord } from "../domain/types";
import { emitMonitoringEvents } from "../sockets/io";

/** Previous SNMP counters per device, for bandwidth delta computation. */
const lastCounters = new Map<
  string,
  { inOctets: number | null; outOctets: number | null; at: number }
>();

let cycleRunning = false;
let cronTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  // node-cron minimum granularity is 1s; run every 30s via two offsets,
  // or honor a custom interval by scheduling every N seconds.
  const interval = Math.max(5, env.pollIntervalSeconds);
  const expr =
    interval % 60 === 0
      ? `0 */${interval / 60} * * * *`
      : `*/${interval} * * * * *`;
  cronTask = cron.schedule(expr, () => void runMonitoringCycle());
  logger.info(`Monitoring scheduler started (every ${interval}s, cron "${expr}")`);
  // fire immediately on boot
  void runMonitoringCycle();
}

export function stopScheduler(): void {
  cronTask?.stop();
}

export async function runMonitoringCycle(): Promise<void> {
  if (cycleRunning) {
    logger.warn("Previous monitoring cycle still running — skipping this tick");
    return;
  }
  cycleRunning = true;
  const startedAt = Date.now();
  try {
    const [devices, settings] = await Promise.all([
      deviceRepository.findAll(),
      settingsRepository.get(),
    ]);
    if (devices.length === 0) return;

    // Partition devices per network — one worker per network (5 fixed).
    const byNetwork = new Map<number, typeof devices>();
    for (const d of devices) {
      const list = byNetwork.get(d.network_id) ?? [];
      list.push(d);
      byNetwork.set(d.network_id, list);
    }

    const batches = await Promise.all(
      [...byNetwork.values()].map((batch) => runWorker(batch)),
    );
    const raw = batches.flat();

    const results: PollResult[] = raw.map((r) => toPollResult(r, settings));
    await metricRepository.insertBatch(results);
    await evaluateAlerts(results, settings);
    await recordHealth("scheduler", "healthy", `cycle ${Date.now() - startedAt}ms`);

    emitMonitoringEvents(results);
    logger.info(
      `Monitoring cycle complete: ${results.length} devices in ${Date.now() - startedAt}ms`,
    );
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)));
    await recordHealth(
      "scheduler",
      "failed",
      err instanceof Error ? err.message : "unknown",
    ).catch(() => undefined);
  } finally {
    cycleRunning = false;
  }
}

function runWorker(
  devices: Array<{ id: string; ip_address: string; network_id: number }>,
): Promise<RawProbeResult[]> {
  return new Promise((resolve) => {
    const worker = new Worker(path.join(__dirname, "poll.worker.js"), {
      workerData: {
        devices: devices.map((d) => ({
          id: d.id,
          ip: d.ip_address,
          networkId: d.network_id,
        })),
        icmpPacketCount: env.icmpPacketCount,
        icmpTimeoutSeconds: env.icmpTimeoutSeconds,
        snmpCommunity: env.snmpCommunity,
        snmpPort: env.snmpPort,
        snmpTimeoutMs: env.snmpTimeoutMs,
      },
    });
    const timeout = setTimeout(() => {
      void worker.terminate();
      resolve(
        devices.map((d) => ({
          deviceId: d.id,
          networkId: d.network_id,
          alive: false,
          latencyMs: null,
          packetLossPct: 100,
          snmpInOctets: null,
          snmpOutOctets: null,
        })),
      );
    }, 25_000);
    worker.once("message", (msg: RawProbeResult[]) => {
      clearTimeout(timeout);
      resolve(msg);
      void worker.terminate();
    });
    worker.once("error", (err) => {
      clearTimeout(timeout);
      logger.error(`Poll worker error: ${err.message}`);
      resolve([]);
    });
  });
}

function toPollResult(r: RawProbeResult, s: SettingsRecord): PollResult {
  const prev = lastCounters.get(r.deviceId);
  const now = Date.now();
  const intervalSec = prev ? (now - prev.at) / 1000 : s.poll_interval_sec;
  const bwIn = octetsToMbps(prev?.inOctets ?? null, r.snmpInOctets, intervalSec);
  const bwOut = octetsToMbps(prev?.outOctets ?? null, r.snmpOutOctets, intervalSec);
  lastCounters.set(r.deviceId, {
    inOctets: r.snmpInOctets,
    outOctets: r.snmpOutOctets,
    at: now,
  });

  let status: DeviceStatus = "down";
  if (r.alive) {
    const degraded =
      (r.latencyMs !== null && r.latencyMs > s.latency_warn_ms) ||
      r.packetLossPct > s.packet_loss_warn_pct;
    status = degraded ? "degraded" : "up";
  }

  return {
    deviceId: r.deviceId,
    networkId: r.networkId,
    status,
    latencyMs: r.latencyMs,
    packetLoss: r.packetLossPct,
    bandwidthInMbps: bwIn,
    bandwidthOutMbps: bwOut,
    snmpInOctets: r.snmpInOctets,
    snmpOutOctets: r.snmpOutOctets,
  };
}

async function evaluateAlerts(results: PollResult[], s: SettingsRecord): Promise<void> {
  for (const r of results) {
    const cleared: string[] = [];

    if (r.status === "down") {
      await upsertAlert(r, "critical", "device_down", "Device unreachable — ICMP timeout");
    } else {
      cleared.push("device_down");
    }

    if (r.latencyMs !== null && r.latencyMs > s.latency_crit_ms) {
      await upsertAlert(r, "critical", "high_latency", `Latency ${r.latencyMs}ms > critical ${s.latency_crit_ms}ms`);
    } else if (r.latencyMs !== null && r.latencyMs > s.latency_warn_ms) {
      await upsertAlert(r, "warning", "high_latency", `Latency ${r.latencyMs}ms > warning ${s.latency_warn_ms}ms`);
    } else {
      cleared.push("high_latency");
    }

    if (r.status !== "down" && r.packetLoss > s.packet_loss_crit_pct) {
      await upsertAlert(r, "critical", "packet_loss", `Packet loss ${r.packetLoss}% > critical ${s.packet_loss_crit_pct}%`);
    } else if (r.status !== "down" && r.packetLoss > s.packet_loss_warn_pct) {
      await upsertAlert(r, "warning", "packet_loss", `Packet loss ${r.packetLoss}% > warning ${s.packet_loss_warn_pct}%`);
    } else if (r.status !== "down") {
      cleared.push("packet_loss");
    }

    if (r.bandwidthInMbps > s.bandwidth_warn_mbps || r.bandwidthOutMbps > s.bandwidth_warn_mbps) {
      await upsertAlert(r, "warning", "bandwidth_utilization", `Bandwidth ${Math.max(r.bandwidthInMbps, r.bandwidthOutMbps)}Mbps > ${s.bandwidth_warn_mbps}Mbps`);
    } else {
      cleared.push("bandwidth_utilization");
    }

    await alertRepository.autoResolveCleared(r.deviceId, cleared);
  }
}

async function upsertAlert(
  r: PollResult,
  severity: "critical" | "warning" | "info",
  type: string,
  message: string,
): Promise<void> {
  const existing = await alertRepository.findActiveByDeviceAndType(r.deviceId, type);
  if (existing) {
    await alertRepository.touch(existing.id, severity, message);
  } else {
    await alertRepository.create({
      deviceId: r.deviceId,
      networkId: r.networkId,
      severity,
      type,
      message,
    });
  }
}

async function recordHealth(
  component: string,
  status: string,
  detail: string,
): Promise<void> {
  await query(
    `INSERT INTO health_checks (component, status, detail) VALUES ($1, $2, $3)`,
    [component, status, detail],
  );
}

/** Nightly retention job — prunes metrics past the configured window. */
export function startRetentionJob(): void {
  cron.schedule("0 30 2 * * *", async () => {
    try {
      const settings = await settingsRepository.get();
      const removed = await metricRepository.pruneOlderThan(settings.retention_days);
      logger.info(`Retention job removed ${removed} metric rows`);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
