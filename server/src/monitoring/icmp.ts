import ping from "ping";

export interface IcmpResult {
  alive: boolean;
  latencyMs: number | null;
  packetLossPct: number;
}

/**
 * Run an ICMP probe against a host using the system ping binary.
 * Sends `count` echo requests and parses latency + packet loss.
 */
export async function icmpProbe(
  host: string,
  count: number,
  timeoutSeconds: number,
): Promise<IcmpResult> {
  try {
    const res = await ping.promise.probe(host, {
      timeout: timeoutSeconds,
      min_reply: count,
      extra: process.platform === "win32" ? ["-n", String(count)] : ["-c", String(count)],
    });
    const latency =
      res.alive && res.time !== "unknown" ? Number(res.avg ?? res.time) : null;
    const loss = Number.parseFloat(res.packetLoss ?? "100");
    return {
      alive: res.alive,
      latencyMs: latency !== null && Number.isFinite(latency) ? latency : null,
      packetLossPct: Number.isFinite(loss) ? loss : res.alive ? 0 : 100,
    };
  } catch {
    return { alive: false, latencyMs: null, packetLossPct: 100 };
  }
}
