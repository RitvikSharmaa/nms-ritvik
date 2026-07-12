import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { PollResult } from "../domain/types";

let io: Server | null = null;
let connectedClients = 0;

export function initSocketIo(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, methods: ["GET", "POST"] },
    path: "/socket.io",
    // Production settings for reliability
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling'],
  });

  io.on("connection", (socket) => {
    connectedClients++;
    logger.info(`Socket connected: ${socket.id} (total: ${connectedClients})`);
    
    socket.on("subscribe:network", (networkName: string) => {
      if (typeof networkName === 'string' && networkName.startsWith('Network-')) {
        void socket.join(`network:${networkName}`);
        logger.debug(`Socket ${socket.id} subscribed to ${networkName}`);
      } else {
        logger.warn(`Socket ${socket.id} attempted invalid network subscription: ${networkName}`);
      }
    });
    
    socket.on("unsubscribe:network", (networkName: string) => {
      void socket.leave(`network:${networkName}`);
      logger.debug(`Socket ${socket.id} unsubscribed from ${networkName}`);
    });
    
    socket.on("disconnect", (reason) => {
      connectedClients--;
      logger.info(`Socket disconnected: ${socket.id} (reason: ${reason}, remaining: ${connectedClients})`);
    });
    
    socket.on("error", (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  io.on("connect_error", (error) => {
    logger.error("Socket.IO connection error:", error);
  });

  return io;
}

/** Broadcast a completed monitoring cycle to all dashboard clients. */
export function emitMonitoringEvents(results: PollResult[]): void {
  if (!io) return;
  
  try {
    // Emit to all clients
    io.emit("metrics:cycle", {
      at: Date.now(),
      count: results.length,
      results,
    });
    
    // Also emit to network-specific rooms
    const byNetwork = new Map<number, PollResult[]>();
    for (const r of results) {
      const list = byNetwork.get(r.networkId) ?? [];
      list.push(r);
      byNetwork.set(r.networkId, list);
    }
    
    for (const [networkId, networkResults] of byNetwork) {
      io.to(`network:Network-${networkId}`).emit("network:metrics", {
        networkId,
        at: Date.now(),
        results: networkResults,
      });
    }
  } catch (err) {
    logger.error("Failed to emit monitoring events:", err);
  }
}

export function emitAlert(alert: unknown): void {
  if (!io) return;
  
  try {
    io.emit("alert:new", alert);
  } catch (err) {
    logger.error("Failed to emit alert:", err);
  }
}

export function emitDeviceImported(count: number): void {
  if (!io) return;
  
  try {
    io.emit("devices:imported", { count, at: Date.now() });
  } catch (err) {
    logger.error("Failed to emit device import event:", err);
  }
}

/** Get current Socket.IO connection count */
export function getConnectedClients(): number {
  return connectedClients;
}
