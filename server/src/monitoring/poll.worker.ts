import { parentPort, workerData } from "worker_threads";
import { icmpProbe } from "./icmp";
import { snmpProbe } from "./snmp";

/**
 * Poll worker: receives a batch of devices (one network per worker) and
 * probes each with ICMP + SNMP concurrently. Posts raw results back to
 * the scheduler, which computes bandwidth deltas, statuses and alerts.
 */

interface WorkerInput {
  devices: Array<{ id: string; ip: string; networkId: number }>;
  icmpPacketCount: number;
  icmpTimeoutSeconds: number;
  snmpCommunity: string;
  snmpPort: number;
  snmpTimeoutMs: number;
}

export interface RawProbeResult {
  deviceId: string;
  networkId: number;
  alive: boolean;
  latencyMs: number | null;
  packetLossPct: number;
  snmpInOctets: number | null;
  snmpOutOctets: number | null;
}

async function run(input: WorkerInput): Promise<void> {
  const results = await Promise.all(
    input.devices.map(async (device): Promise<RawProbeResult> => {
      const [icmp, snmpRes] = await Promise.all([
        icmpProbe(device.ip, input.icmpPacketCount, input.icmpTimeoutSeconds),
        snmpProbe(device.ip, input.snmpCommunity, input.snmpPort, input.snmpTimeoutMs),
      ]);
      return {
        deviceId: device.id,
        networkId: device.networkId,
        alive: icmp.alive,
        latencyMs: icmp.latencyMs,
        packetLossPct: icmp.packetLossPct,
        snmpInOctets: snmpRes.inOctets,
        snmpOutOctets: snmpRes.outOctets,
      };
    }),
  );
  parentPort?.postMessage(results);
}

void run(workerData as WorkerInput);
