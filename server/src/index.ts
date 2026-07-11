import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { runMigrations } from "./db/migrate";
import { initSocketIo } from "./sockets/io";
import { startRetentionJob, startScheduler, stopScheduler } from "./monitoring/scheduler";
import { pool } from "./config/db";

async function main(): Promise<void> {
  await runMigrations();

  const app = createApp();
  const server = http.createServer(app);
  initSocketIo(server);

  server.listen(env.port, () => {
    logger.info(`NMS API listening on :${env.port} (${env.nodeEnv})`);
    logger.info(`Swagger docs at /api/docs`);
  });

  startScheduler();
  startRetentionJob();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    stopScheduler();
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
