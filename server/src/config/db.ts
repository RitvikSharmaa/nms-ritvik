import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "./logger";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error(`Unexpected PostgreSQL pool error: ${err.message}`);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params as never[]);
  const ms = Date.now() - start;
  if (ms > 500) {
    logger.warn(`Slow query (${ms}ms): ${text.slice(0, 120)}`);
  }
  return res;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
