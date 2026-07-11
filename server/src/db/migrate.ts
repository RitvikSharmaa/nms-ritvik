import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { pool, query } from "../config/db";
import { env } from "../config/env";
import { logger } from "../config/logger";

/**
 * Simple forward-only migration runner. Applies every .sql file in
 * ./migrations (sorted) exactly once, tracked in schema_migrations.
 */
export async function runMigrations(): Promise<void> {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rowCount } = await query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (rowCount && rowCount > 0) continue;
    logger.info(`Applying migration ${file}`);
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  await ensureAdminUser();
}

async function ensureAdminUser(): Promise<void> {
  const { rowCount } = await query("SELECT 1 FROM users WHERE username = $1", [
    env.adminUsername,
  ]);
  if (rowCount && rowCount > 0) return;
  const hash = await bcrypt.hash(env.adminPassword, env.bcryptRounds);
  await query(
    `INSERT INTO users (username, full_name, email, password_hash, role_id)
     VALUES ($1, 'System Administrator', $2, $3,
       (SELECT id FROM roles WHERE name = 'admin'))`,
    [env.adminUsername, `${env.adminUsername}@corp.local`, hash],
  );
  logger.info(`Created initial admin user "${env.adminUsername}"`);
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("Migrations complete");
      return pool.end();
    })
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}
