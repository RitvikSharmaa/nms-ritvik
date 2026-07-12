import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "./logger";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Enable keepalive for long-running connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Monitor pool events for observability
pool.on("error", (err) => {
  logger.error(`Unexpected PostgreSQL pool error: ${err.message}`, err);
});

pool.on("connect", () => {
  logger.debug("New database connection established");
});

pool.on("acquire", () => {
  logger.debug("Database connection acquired from pool");
});

pool.on("remove", () => {
  logger.debug("Database connection removed from pool");
});

// Log pool statistics periodically for monitoring
let poolStatsInterval: NodeJS.Timeout | null = null;

export function startPoolMonitoring(intervalMs = 60_000): void {
  if (poolStatsInterval) return;
  
  poolStatsInterval = setInterval(() => {
    logger.info("PostgreSQL pool stats", {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
    
    // Warn if pool is under pressure
    if (pool.waitingCount > 0) {
      logger.warn(`Database pool has ${pool.waitingCount} waiting clients - consider increasing pool size`);
    }
    if (pool.idleCount === 0 && pool.totalCount === 20) {
      logger.warn("Database pool exhausted - all connections in use");
    }
  }, intervalMs);
}

export function stopPoolMonitoring(): void {
  if (poolStatsInterval) {
    clearInterval(poolStatsInterval);
    poolStatsInterval = null;
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params as never[]);
    const ms = Date.now() - start;
    
    // Log slow queries for performance monitoring
    if (ms > 500) {
      logger.warn(`Slow query (${ms}ms): ${text.slice(0, 120)}`, {
        duration: ms,
        rowCount: res.rowCount ?? 0,
      });
    } else if (ms > 100) {
      logger.debug(`Query took ${ms}ms: ${text.slice(0, 60)}`);
    }
    
    return res;
  } catch (err) {
    const ms = Date.now() - start;
    logger.error(`Query failed after ${ms}ms: ${text.slice(0, 120)}`, err);
    throw err;
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const startTime = Date.now();
  
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      logger.warn(`Long transaction: ${duration}ms`);
    }
    
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Transaction rolled back", err);
    throw err;
  } finally {
    client.release();
  }
}

/** Get current pool statistics for health checks */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
