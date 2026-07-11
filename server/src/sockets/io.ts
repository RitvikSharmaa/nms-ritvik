import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { PollResult } from "../domain/types";

let io: Server | null = null;

export function initSocketIo(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on("subscribe:network", (networkName: string) => {
      void socket.join(`network:${networkName}`);
    });
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/** Broadcast a completed monitoring cycle to all dashboard clients. */
export function emitMonitoringEvents(results: PollResult[]): void {
  if (!io) return;
  io.emit("metrics:cycle", {
    at: Date.now(),
    count: results.length,
    results,
  });
}

export function emitAlert(alert: unknown): void {
  io?.emit("alert:new", alert);
}

export function emitDeviceImported(count: number): void {
  io?.emit("devices:imported", { count, at: Date.now() });
}
