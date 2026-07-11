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

  async existsByName(deviceName: string, networkName: NetworkName): Promise<boolean> {
    const { rowCount } = await query(
      `SELECT 1 FROM devices d JOIN networks n ON n.id = d.network_id
        WHERE lower(d.device_name) = lower($1) AND n.name = $2`,
      [deviceName, networkName],
    );
    return (rowCount ?? 0) > 0;
  },

  /**
   * Insert one device and its link assignments atomically.
   * Links are ALWAYS stored through the device_links junction table.
   */
  async createWithLinks(input: {
    username: string;
    ip: string;
    deviceName: string;
    network: NetworkName;
    links: LinkName[];
  }): Promise<string> {
    return withTransaction(async (client: PoolClient) => {
      const hostname = `${input.deviceName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.${input.network.toLowerCase()}.corp.local`;
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO devices (username, ip_address, device_name, hostname, network_id)
         VALUES ($1, $2, $3, $4, (SELECT id FROM networks WHERE name = $5))
         RETURNING id`,
        [input.username, input.ip, input.deviceName, hostname, input.network],
      );
      const deviceId = rows[0].id;
      for (const link of input.links) {
        await client.query(
          `INSERT INTO device_links (device_id, link_id)
           VALUES ($1, (SELECT id FROM links WHERE name = $2))
           ON CONFLICT DO NOTHING`,
          [deviceId, link],
        );
      }
      return deviceId;
    });
  },
};
