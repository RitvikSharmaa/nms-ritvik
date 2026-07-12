import ping from "ping";

export interface IcmpResult {
  alive: boolean;
  latencyMs: number | null;
  packetLossPct: number;
}

/**
 * Run an ICMP probe against a host using the system ping binary.
 * Sends `count` echo requests and parses latency + packet loss.
 * 
 * PRODUCTION READY: Handles all failure modes gracefully and returns
 * consistent results even when ping fails or returns invalid data.
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
    
    // Extract latency - prefer avg over single time value
    let latency: number | null = null;
    if (res.alive && res.time !== "unknown") {
      const rawLatency = Number(res.avg ?? res.time);
      latency = Number.isFinite(rawLatency) && rawLatency > 0 ? rawLatency : null;
    }
    
    // Parse packet loss percentage
    const loss = res.packetLoss ? Number.parseFloat(res.packetLoss) : 100;
    const packetLossPct = Number.isFinite(loss) ? loss : (res.alive ? 0 : 100);
    
    return {
      alive: res.alive,
      latencyMs: latency,
      packetLossPct,
    };
  } catch (err) {
    // Ping library throws on various conditions (invalid host, network unreachable, etc.)
    // Treat all errors as device unreachable
    return { 
      alive: false, 
      latencyMs: null, 
      packetLossPct: 100 
    };
  }
}
