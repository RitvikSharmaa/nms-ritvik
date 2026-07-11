import { query } from "../config/db";
import type {
  AlertRecord,
  AlertSeverity,
  AlertState,
  MetricRecord,
  PollResult,
  SettingsRecord,
} from "../domain/types";

export const metricRepository = {
  async insertBatch(results: PollResult[]): Promise<void> {
    if (results.length === 0) return;
    const values: unknown[] = [];
    const tuples = results.map((r, i) => {
      const o = i * 9;
      values.push(
        r.deviceId,
        r.networkId,
        r.status,
        r.latencyMs,
        r.packetLoss,
        r.bandwidthInMbps,
        r.bandwidthOutMbps,
        r.snmpInOctets,
        r.snmpOutOctets,
      );
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9})`;
    });
    await query(
      `INSERT INTO metrics (device_id, network_id, status, latency_ms, packet_loss,
        bandwidth_in, bandwidth_out, snmp_in_octets, snmp_out_octets)
       VALUES ${tuples.join(",")}`,
      values,
    );
  },

  async latestPerDevice(): Promise<MetricRecord[]> {
    const { rows } = await query<MetricRecord>(
      `SELECT DISTINCT ON (device_id)
              id::text, device_id, network_id, status, latency_ms,
              packet_loss, bandwidth_in, bandwidth_out, polled_at
         FROM metrics
        ORDER BY device_id, polled_at DESC`,
    );
    return rows;
  },

  async historyForDevice(deviceId: string, hours: number): Promise<MetricRecord[]> {
    const { rows } = await query<MetricRecord>(
      `SELECT id::text, device_id, network_id, status, latency_ms,
              packet_loss, bandwidth_in, bandwidth_out, polled_at
         FROM metrics
        WHERE device_id = $1 AND polled_at > now() - ($2 || ' hours')::interval
        ORDER BY polled_at ASC`,
      [deviceId, String(hours)],
    );
    return rows;
  },

  async uptimeForDevice(deviceId: string, hours: number): Promise<number> {
    const { rows } = await query<{ uptime: string | null }>(
      `SELECT 100.0 * count(*) FILTER (WHERE status <> 'down') / NULLIF(count(*), 0) AS uptime
         FROM metrics
        WHERE device_id = $1 AND polled_at > now() - ($2 || ' hours')::interval`,
      [deviceId, String(hours)],
    );
    return rows[0]?.uptime === null || rows[0]?.uptime === undefined
      ? 100
      : Number(rows[0].uptime);
  },

  async pruneOlderThan(days: number): Promise<number> {
    const { rowCount } = await query(
      `DELETE FROM metrics WHERE polled_at < now() - ($1 || ' days')::interval`,
      [String(days)],
    );
    return rowCount ?? 0;
  },
};

export const alertRepository = {
  async findActiveByDeviceAndType(
    deviceId: string,
    type: string,
  ): Promise<{ id: string } | null> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM alerts WHERE device_id = $1 AND type = $2 AND state <> 'resolved'`,
      [deviceId, type],
    );
    return rows[0] ?? null;
  },

  async create(input: {
    deviceId: string;
    networkId: number;
    severity: AlertSeverity;
    type: string;
    message: string;
  }): Promise<string> {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO alerts (device_id, network_id, severity, type, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [input.deviceId, input.networkId, input.severity, input.type, input.message],
    );
    return rows[0].id;
  },

  async touch(id: string, severity: AlertSeverity, message: string): Promise<void> {
    await query(
      `UPDATE alerts SET severity = $2, message = $3, updated_at = now() WHERE id = $1`,
      [id, severity, message],
    );
  },

  async transition(
    id: string,
    toState: AlertState,
    userId: string | null,
  ): Promise<boolean> {
    const { rows } = await query<{ state: AlertState }>(
      `SELECT state FROM alerts WHERE id = $1`,
      [id],
    );
    const from = rows[0]?.state;
    if (!from || from === toState) return false;
    await query(
      `UPDATE alerts SET state = $2, updated_at = now(),
              resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END
        WHERE id = $1`,
      [id, toState],
    );
    await query(
      `INSERT INTO alert_history (alert_id, from_state, to_state, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [id, from, toState, userId],
    );
    return true;
  },

  async list(filters: {
    severity?: string;
    state?: string;
    network?: string;
    search?: string;
    limit: number;
  }): Promise<AlertRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.severity) {
      params.push(filters.severity);
      clauses.push(`a.severity = $${params.length}`);
    }
    if (filters.state) {
      params.push(filters.state);
      clauses.push(`a.state = $${params.length}`);
    }
    if (filters.network) {
      params.push(filters.network);
      clauses.push(`n.name = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      clauses.push(
        `(a.message ILIKE $${params.length} OR d.device_name ILIKE $${params.length})`,
      );
    }
    params.push(filters.limit);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<AlertRecord>(
      `SELECT a.id, a.device_id, d.device_name, host(d.ip_address) AS ip_address,
              n.name AS network_name, a.severity, a.type, a.message, a.state,
              a.created_at, a.updated_at, a.resolved_at
         FROM alerts a
         JOIN devices d ON d.id = a.device_id
         JOIN networks n ON n.id = a.network_id
         ${where}
        ORDER BY a.created_at DESC
        LIMIT $${params.length}`,
      params,
    );
    return rows;
  },

  async autoResolveCleared(
    deviceId: string,
    types: string[],
  ): Promise<string[]> {
    if (types.length === 0) return [];
    const { rows } = await query<{ id: string }>(
      `UPDATE alerts SET state = 'resolved', resolved_at = now(), updated_at = now()
        WHERE device_id = $1 AND type = ANY($2) AND state <> 'resolved'
        RETURNING id`,
      [deviceId, types],
    );
    return rows.map((r) => r.id);
  },
};

export const settingsRepository = {
  async get(): Promise<SettingsRecord> {
    const { rows } = await query<SettingsRecord>(`SELECT * FROM settings WHERE id = 1`);
    return rows[0];
  },

  async update(patch: Partial<SettingsRecord>): Promise<SettingsRecord> {
    const allowed: Array<keyof SettingsRecord> = [
      "poll_interval_sec",
      "latency_warn_ms",
      "latency_crit_ms",
      "packet_loss_warn_pct",
      "packet_loss_crit_pct",
      "bandwidth_warn_mbps",
      "snmp_community",
      "snmp_version",
      "retention_days",
    ];
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        params.push(patch[key]);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.get();
    await query(`UPDATE settings SET ${sets.join(", ")}, updated_at = now() WHERE id = 1`, params);
    return this.get();
  },
};

export const auditRepository = {
  async record(input: {
    userId: string | null;
    username: string;
    action: string;
    target: string;
    details: string;
    ipAddress: string;
  }): Promise<void> {
    await query(
      `INSERT INTO audit_logs (user_id, username, action, target, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.userId, input.username, input.action, input.target, input.details, input.ipAddress],
    );
  },

  async list(limit: number): Promise<unknown[]> {
    const { rows } = await query(
      `SELECT id::text, username, action, target, details, ip_address, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows;
  },
};
