import { query } from "../config/db";
import type { NetworkName } from "../domain/types";

export interface NetworkStats {
  network: NetworkName;
  total_devices: number;
  online: number;
  degraded: number;
  offline: number;
  avg_latency: number | null;
  avg_packet_loss: number;
  avg_uptime: number;
  bandwidth_in: number;
  bandwidth_out: number;
  active_alerts: number;
}

const NETWORK_STATS_SQL = `
  WITH latest AS (
    SELECT DISTINCT ON (m.device_id) m.*
      FROM metrics m
     ORDER BY m.device_id, m.polled_at DESC
  ),
  uptime AS (
    SELECT device_id,
           100.0 * count(*) FILTER (WHERE status <> 'down') / NULLIF(count(*),0) AS pct
      FROM metrics
     WHERE polled_at > now() - interval '24 hours'
     GROUP BY device_id
  )
  SELECT n.name AS network,
         count(d.id)::int AS total_devices,
         count(l.device_id) FILTER (WHERE l.status = 'up')::int AS online,
         count(l.device_id) FILTER (WHERE l.status = 'degraded')::int AS degraded,
         count(l.device_id) FILTER (WHERE l.status = 'down')::int AS offline,
         round(avg(l.latency_ms)::numeric, 1)::float AS avg_latency,
         COALESCE(round(avg(l.packet_loss)::numeric, 1), 0)::float AS avg_packet_loss,
         COALESCE(round(avg(u.pct)::numeric, 2), 100)::float AS avg_uptime,
         COALESCE(round(sum(l.bandwidth_in)::numeric), 0)::float AS bandwidth_in,
         COALESCE(round(sum(l.bandwidth_out)::numeric), 0)::float AS bandwidth_out,
         (SELECT count(*)::int FROM alerts a
           WHERE a.network_id = n.id AND a.state <> 'resolved') AS active_alerts
    FROM networks n
    LEFT JOIN devices d ON d.network_id = n.id
    LEFT JOIN latest l ON l.device_id = d.id
    LEFT JOIN uptime u ON u.device_id = d.id
   GROUP BY n.id, n.name
   ORDER BY n.name
`;

export const dashboardService = {
  async networkStats(): Promise<NetworkStats[]> {
    const { rows } = await query<NetworkStats>(NETWORK_STATS_SQL);
    return rows;
  },

  async globalTrend(hours: number): Promise<unknown[]> {
    const { rows } = await query(
      `SELECT date_trunc('minute', polled_at) AS bucket,
              round(avg(latency_ms)::numeric, 1)::float AS latency,
              round(avg(packet_loss)::numeric, 1)::float AS packet_loss,
              round(sum(bandwidth_in)::numeric)::float AS bandwidth_in,
              round(sum(bandwidth_out)::numeric)::float AS bandwidth_out
         FROM metrics
        WHERE polled_at > now() - ($1 || ' hours')::interval
        GROUP BY bucket
        ORDER BY bucket`,
      [String(hours)],
    );
    return rows;
  },

  async topProblemDevices(limit: number): Promise<unknown[]> {
    const { rows } = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (device_id) * FROM metrics ORDER BY device_id, polled_at DESC
       )
       SELECT d.id, d.device_name, host(d.ip_address) AS ip_address, n.name AS network,
              l.status, l.latency_ms, l.packet_loss
         FROM latest l
         JOIN devices d ON d.id = l.device_id
         JOIN networks n ON n.id = d.network_id
        ORDER BY (CASE l.status WHEN 'down' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END),
                 l.packet_loss DESC, l.latency_ms DESC NULLS LAST
        LIMIT $1`,
      [limit],
    );
    return rows;
  },
};
