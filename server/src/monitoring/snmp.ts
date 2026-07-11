import * as snmp from "net-snmp";

/** ifInOctets / ifOutOctets for interface index 1 (IF-MIB). */
const OID_IF_IN_OCTETS = "1.3.6.1.2.1.2.2.1.10.1";
const OID_IF_OUT_OCTETS = "1.3.6.1.2.1.2.2.1.16.1";

export interface SnmpResult {
  inOctets: number | null;
  outOctets: number | null;
}

/**
 * Query interface octet counters over SNMP.
 * Returns nulls when the device does not answer (non-SNMP device) —
 * this is not an error condition for the monitoring pipeline.
 */
export function snmpProbe(
  host: string,
  community: string,
  port: number,
  timeoutMs: number,
): Promise<SnmpResult> {
  return new Promise((resolve) => {
    const session = snmp.createSession(host, community, {
      port,
      timeout: timeoutMs,
      retries: 0,
      version: snmp.Version2c,
    });

    const done = (result: SnmpResult) => {
      try {
        session.close();
      } catch {
        /* session already closed */
      }
      resolve(result);
    };

    const timer = setTimeout(() => done({ inOctets: null, outOctets: null }), timeoutMs + 500);

    session.get([OID_IF_IN_OCTETS, OID_IF_OUT_OCTETS], (error, varbinds) => {
      clearTimeout(timer);
      if (error || !varbinds || varbinds.length < 2) {
        done({ inOctets: null, outOctets: null });
        return;
      }
      const val = (i: number): number | null => {
        const vb = varbinds[i];
        if (!vb || snmp.isVarbindError(vb)) return null;
        const n = Number(vb.value);
        return Number.isFinite(n) ? n : null;
      };
      done({ inOctets: val(0), outOctets: val(1) });
    });
  });
}

/**
 * Convert two successive counter samples to Mbps.
 * Handles 32-bit counter wrap.
 */
export function octetsToMbps(
  prev: number | null,
  curr: number | null,
  intervalSeconds: number,
): number {
  if (prev === null || curr === null || intervalSeconds <= 0) return 0;
  let delta = curr - prev;
  if (delta < 0) delta += 2 ** 32; // counter wrapped
  return Math.round(((delta * 8) / intervalSeconds / 1_000_000) * 10) / 10;
}
