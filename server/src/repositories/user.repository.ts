import { query } from "../config/db";

export interface UserRow {
  id: string;
  username: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const USER_SELECT = `
  SELECT u.id, u.username, u.full_name, u.email, u.password_hash,
         r.name AS role, u.active, u.last_login_at, u.created_at
    FROM users u JOIN roles r ON r.id = u.role_id
`;

export const userRepository = {
  async findByUsername(username: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(`${USER_SELECT} WHERE u.username = $1`, [username]);
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(`${USER_SELECT} WHERE u.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async list(): Promise<Omit<UserRow, "password_hash">[]> {
    const { rows } = await query<UserRow>(`${USER_SELECT} ORDER BY u.created_at`);
    return rows.map(({ password_hash: _ph, ...rest }) => rest);
  },

  async permissionsForRole(role: string): Promise<string[]> {
    const { rows } = await query<{ name: string }>(
      `SELECT p.name FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN roles r ON r.id = rp.role_id
       WHERE r.name = $1`,
      [role],
    );
    return rows.map((r) => r.name);
  },

  async create(input: {
    username: string;
    fullName: string;
    email: string;
    passwordHash: string;
    role: string;
  }): Promise<string> {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (username, full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5))
       RETURNING id`,
      [input.username, input.fullName, input.email, input.passwordHash, input.role],
    );
    return rows[0].id;
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await query(`UPDATE users SET active = $2, updated_at = now() WHERE id = $1`, [id, active]);
  },

  async setRole(id: string, role: string): Promise<void> {
    await query(
      `UPDATE users SET role_id = (SELECT id FROM roles WHERE name = $2), updated_at = now()
        WHERE id = $1`,
      [id, role],
    );
  },

  async touchLogin(id: string): Promise<void> {
    await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
  },
};
