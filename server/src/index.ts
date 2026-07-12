/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVER ENTRY POINT - Main Application Startup
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the main entry point for the Enterprise Network Monitoring System (NMS) backend.
 * It orchestrates the startup sequence, initializes all subsystems, and handles graceful shutdown.
 * 
 * STARTUP SEQUENCE:
 * 1. Run database migrations (creates/updates schema)
 * 2. Create Express app with all middleware and routes
 * 3. Create HTTP server and attach Socket.IO for real-time communication
 * 4. Start listening on configured port
 * 5. Start monitoring engine (polls devices every 30 seconds)
 * 6. Start retention job (cleans old metrics daily)
 * 7. Start database pool monitoring (tracks connection health)
 * 
 * SHUTDOWN SEQUENCE (on SIGINT/SIGTERM):
 * 1. Stop accepting new HTTP requests
 * 2. Stop monitoring scheduler and retention job
 * 3. Stop database pool monitoring
 * 4. Close all database connections
 * 5. Exit process cleanly
 * 
 * @module server/index
 */

import http from "http"; // Node.js HTTP server for Express
import { createApp } from "./app"; // Express application factory
import { env } from "./config/env"; // Environment variables (PORT, NODE_ENV, etc.)
import { logger } from "./config/logger"; // Winston logger for structured logging
import { runMigrations } from "./db/migrate"; // Database migration runner
import { initSocketIo } from "./sockets/io"; // Socket.IO initialization for real-time updates
import { startRetentionJob, startScheduler, stopScheduler } from "./monitoring/scheduler"; // Monitoring engine
import { pool, startPoolMonitoring, stopPoolMonitoring } from "./config/db"; // PostgreSQL connection pool

/**
 * Main application entry point
 * 
 * This async function coordinates the entire server startup process.
 * It ensures all systems are initialized in the correct order before
 * the server starts accepting requests.
 * 
 * @returns Promise that resolves when server is fully started
 * @throws Error if any critical startup step fails
 */
async function main(): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Run Database Migrations
  // ─────────────────────────────────────────────────────────────────────────
  // This ensures the database schema is up-to-date before the app starts.
  // Migrations are tracked in the 'schema_migrations' table and only run once.
  // If this is the first run, it will:
  // - Create all 17 tables (users, devices, networks, metrics, alerts, etc.)
  // - Create indexes and constraints
  // - Seed fixed data (networks, links, roles, permissions)
  // - Create the initial admin user
  await runMigrations();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Create Express Application
  // ─────────────────────────────────────────────────────────────────────────
  // This creates the Express app with all middleware configured:
  // - Morgan for HTTP request logging
  // - Helmet for security headers
  // - CORS for cross-origin requests
  // - JSON body parser
  // - All API routes mounted under /api
  // - Error handling middleware
  const app = createApp();
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Create HTTP Server and Initialize Socket.IO
  // ─────────────────────────────────────────────────────────────────────────
  // We create a raw HTTP server (not just app.listen) so we can attach
  // Socket.IO to it for bidirectional real-time communication.
  const server = http.createServer(app);
  
  // Initialize Socket.IO for broadcasting:
  // - metrics:cycle - After each 30s monitoring cycle completes
  // - alert:new - When new alerts are created
  // - devices:imported - After bulk device upload
  initSocketIo(server);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Start HTTP Server
  // ─────────────────────────────────────────────────────────────────────────
  // Start listening for HTTP requests on the configured port (default: 4000)
  server.listen(env.port, () => {
    logger.info(`NMS API listening on :${env.port} (${env.nodeEnv})`);
    logger.info(`Swagger docs at /api/docs`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Start Monitoring Subsystems
  // ─────────────────────────────────────────────────────────────────────────
  
  // Start the monitoring scheduler (runs every 30 seconds by default)
  // This is the heart of the NMS - it polls all devices via ICMP and SNMP,
  // collects metrics, evaluates alerts, and broadcasts results via Socket.IO
  startScheduler();
  
  // Start the retention job (runs daily at 02:30)
  // This cleans up old metrics based on the retention_days setting (default: 90 days)
  // Prevents the metrics table from growing indefinitely
  startRetentionJob();
  
  // Start database connection pool monitoring
  // This logs pool statistics (active connections, idle, waiting) every minute
  // and helps detect connection leaks or pool exhaustion issues
  startPoolMonitoring();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Register Graceful Shutdown Handlers
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Graceful shutdown handler
   * 
   * This function is called when the process receives SIGINT (Ctrl+C) or
   * SIGTERM (docker stop, kubernetes termination). It ensures all resources
   * are cleaned up properly before the process exits.
   * 
   * CRITICAL FOR PRODUCTION:
   * - Prevents abrupt termination mid-request
   * - Allows in-flight monitoring cycles to complete
   * - Closes database connections cleanly
   * - Prevents connection leaks and orphaned workers
   * 
   * @param signal - The signal that triggered shutdown (SIGINT or SIGTERM)
   */
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    
    // Stop accepting new HTTP requests
    // Existing connections are allowed to complete (up to a timeout)
    server.close((err) => {
      if (err) {
        logger.error("Error closing HTTP server:", err);
      }
    });
    
    // Stop the monitoring scheduler (prevents new polling cycles)
    // and stop pool monitoring (prevents new log messages)
    stopScheduler();
    stopPoolMonitoring();
    
    // Close all database connections in the pool
    // This ensures no open connections are left dangling when the process exits
    await pool.end();
    
    logger.info("Shutdown complete");
    process.exit(0); // Exit with success code
  };
  
  // Register shutdown handlers for both SIGINT (Ctrl+C) and SIGTERM (Docker/K8s)
  // The 'void' is needed because shutdown returns a Promise but the event handler doesn't await
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

// ═══════════════════════════════════════════════════════════════════════════
// Execute Main Function
// ═══════════════════════════════════════════════════════════════════════════
// Start the application and catch any unhandled errors during startup.
// If startup fails, log the error and exit with a failure code.
main().catch((err) => {
  logger.error(err instanceof Error ? err : new Error(String(err)));
  process.exit(1); // Exit with error code to signal failure to process manager
});
