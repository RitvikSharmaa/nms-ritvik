import type { PoolClient } from "pg";
import { query, withTransaction } from "../config/db";
import type { DeviceRecord, LinkName, NetworkName } from "../domain/types";

const DEVICE_SELECT = `
  SELECT d.id, d.username, host(d.ip_address) AS ip_address, d.device_name,
         d.hostname, d.network_id, n.name AS network_name,
         d.vendor, d.model, d.mac_address, d.created_at, d.updated_at,
         COALESCE(
           (SELECT array_agg(l.name ORDER BY l.name)
              FROM device_links dl JOIN links l ON l.id = dl.link_id
             WHERE dl.device_id = d.id),
           '{}'
         ) AS links
    FROM devices d
    JOIN networks n ON n.id = d.network_id
`;

export const deviceRepository = {
  async findAll(): Promise<DeviceRecord[]> {
    const { rows } = await query<DeviceRecord>(`${DEVICE_SELECT} ORDER BY d.device_name`);
    return rows;
  },

  async findByNetwork(networkName: NetworkName): Promise<DeviceRecord[]> {
    const { rows } = await query<DeviceRecord>(
      `${DEVICE_SELECT} WHERE n.name = $1 ORDER BY d.device_name`,
      [networkName],
    );
    return rows;
  },

  async findById(id: string): Promise<DeviceRecord | null> {
    const { rows } = await query<DeviceRecord>(`${DEVICE_SELECT} WHERE d.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async existsByIp(ip: string): Promise<boolean> {
    const { rowCount } = await query("SELECT 1 FROM devices WHERE ip_address = $1", [ip]);
    return (rowCount ?? 0) > 0;
  },

  async findIdByIp(ip: string): Promise<string | null> {
    const { rows } = await query<{ id: string }>(
      "SELECT id FROM devices WHERE ip_address = $1",
      [ip],
    );
    return rows[0]?.id ?? null;
  },

  async existsByName(deviceName: string, networkName: NetworkName): Promise<boolean> {
    const { rowCount } = await query(
      `SELECT 1 FROM devices d JOIN networks n ON n.id = d.network_id
        WHERE lower(d.device_name) = lower($1) AND n.name = $2`,
      [deviceName, networkName],
    );
    return (rowCount ?? 0) > 0;
  },

  /**
   * Delete every device whose IP is NOT in the provided keep-set.
   * Returns the number of removed rows. Cascades to device_links / metrics
   * via ON DELETE CASCADE. Used by source-of-truth upload mode.
   */
  async deleteAllExceptIps(keepIps: string[]): Promise<number> {
    if (keepIps.length === 0) {
      const { rowCount } = await query("DELETE FROM devices");
      return rowCount ?? 0;
    }
    const { rowCount } = await query(
      "DELETE FROM devices WHERE NOT (ip_address = ANY($1::inet[]))",
      [keepIps],
    );
    return rowCount ?? 0;
  },

  /**
   * Insert one device and its link assignments atomically, OR update the
   * existing device if the IP already exists. Links are ALWAYS stored through
   * the device_links junction table and fully replaced on update.
   */
  async upsertWithLinks(input: {
    username: string;
    ip: string;
    deviceName: string;
    network: NetworkName;
    links: LinkName[];
  }): Promise<{ id: string; created: boolean }> {
    return withTransaction(async (client: PoolClient) => {
      const hostname = `${input.deviceName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.${input.network.toLowerCase()}.corp.local`;

      const existing = await client.query<{ id: string }>(
        "SELECT id FROM devices WHERE ip_address = $1 FOR UPDATE",
        [input.ip],
      );

      let deviceId: string;
      let created: boolean;

      if (existing.rowCount && existing.rowCount > 0) {
        deviceId = existing.rows[0].id;
        await client.query(
          `UPDATE devices
              SET username = $1, device_name = $2, hostname = $3,
                  network_id = (SELECT id FROM networks WHERE name = $4),
                  updated_at = NOW()
            WHERE id = $5`,
          [input.username, input.deviceName, hostname, input.network, deviceId],
        );
        await client.query("DELETE FROM device_links WHERE device_id = $1", [deviceId]);
        created = false;
      } else {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO devices (username, ip_address, device_name, hostname, network_id)
           VALUES ($1, $2, $3, $4, (SELECT id FROM networks WHERE name = $5))
           RETURNING id`,
          [input.username, input.ip, input.deviceName, hostname, input.network],
        );
        deviceId = rows[0].id;
        created = true;
      }

      for (const link of input.links) {
        await client.query(
          `INSERT INTO device_links (device_id, link_id)
           VALUES ($1, (SELECT id FROM links WHERE name = $2))
           ON CONFLICT DO NOTHING`,
          [deviceId, link],
        );
      }

      return { id: deviceId, created };
    });
  },
};
