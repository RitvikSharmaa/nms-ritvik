/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPRESS APPLICATION FACTORY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module creates and configures the Express application with all necessary
 * middleware, routes, and error handlers. It follows a factory pattern so the
 * app can be created multiple times (useful for testing).
 * 
 * MIDDLEWARE STACK (executed in order):
 * 1. Helmet - Security headers (XSS protection, CSP, etc.)
 * 2. CORS - Cross-origin resource sharing configuration
 * 3. JSON Parser - Parses request bodies with 1MB size limit
 * 4. Morgan - HTTP request logging to Winston
 * 5. Swagger UI - Interactive API documentation at /api/docs
 * 6. API Routes - All application endpoints under /api
 * 7. 404 Handler - Catches undefined routes
 * 8. Error Handler - Centralized error response formatting
 * 
 * @module server/app
 */

import express from "express"; // Web framework for Node.js
import helmet from "helmet"; // Security middleware for HTTP headers
import cors from "cors"; // Cross-Origin Resource Sharing middleware
import morgan from "morgan"; // HTTP request logger
import swaggerUi from "swagger-ui-express"; // Swagger UI for API documentation
import { env } from "./config/env"; // Environment variables
import { morganStream } from "./config/logger"; // Winston logger stream for Morgan
import { swaggerSpec } from "./config/swagger"; // OpenAPI specification
import { apiRouter } from "./routes/api"; // All API route handlers
import { errorHandler, notFoundHandler } from "./middleware/validate"; // Error handling middleware

/**
 * Create and configure Express application
 * 
 * This factory function creates a new Express app instance with all middleware
 * and routes configured. It's a pure function with no side effects - the app
 * is configured but not started (no app.listen here).
 * 
 * DESIGN DECISION: Factory pattern instead of singleton
 * - Allows creating multiple app instances for testing
 * - Makes it easy to mock or stub parts of the app
 * - Follows Express best practices
 * 
 * @returns Configured Express application ready to be attached to an HTTP server
 */
export function createApp(): express.Express {
  const app = express();

  // ─────────────────────────────────────────────────────────────────────────
  // PROXY CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  // Tell Express to trust the first proxy (nginx in our docker-compose setup).
  // This is critical for:
  // - req.ip to show real client IP (not the proxy's IP)
  // - req.protocol to reflect actual protocol (http/https)
  // - X-Forwarded-* headers to be respected
  // 
  // Security note: Only set this if behind a trusted proxy!
  // In production behind nginx, this is safe. If exposed directly to internet,
  // set to false to prevent IP spoofing attacks.
  app.set("trust proxy", 1);

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY MIDDLEWARE - Helmet
  // ─────────────────────────────────────────────────────────────────────────
  // Helmet sets various HTTP headers to protect against common vulnerabilities:
  // - X-DNS-Prefetch-Control: Controls browser DNS prefetching
  // - X-Frame-Options: Prevents clickjacking attacks
  // - X-Content-Type-Options: Prevents MIME sniffing
  // - X-XSS-Protection: Enables browser XSS filter
  // - And many more security headers
  app.use(helmet());

  // ─────────────────────────────────────────────────────────────────────────
  // CORS MIDDLEWARE - Cross-Origin Resource Sharing
  // ─────────────────────────────────────────────────────────────────────────
  // Allows the frontend (running on a different port in dev, or same origin
  // in production via nginx) to make requests to this API.
  // 
  // Options:
  // - origin: Which origins can access this API (from env.CORS_ORIGIN)
  // - credentials: true - Allows cookies/auth headers in cross-origin requests
  // 
  // In production, this is typically set to the nginx origin (http://localhost)
  // In development, set to http://localhost:5173 or wherever Vite runs
  app.use(cors({ origin: env.corsOrigin, credentials: true }));

  // ─────────────────────────────────────────────────────────────────────────
  // BODY PARSER MIDDLEWARE
  // ─────────────────────────────────────────────────────────────────────────
  // Parses incoming JSON request bodies and makes them available at req.body
  // 
  // Limit: 1MB maximum payload size
  // - Protects against large payload DOS attacks
  // - Should be sufficient for all API requests (device imports use multipart)
  // - Rejects requests with bodies larger than 1MB with 413 status
  app.use(express.json({ limit: "1mb" }));

  // ─────────────────────────────────────────────────────────────────────────
  // HTTP REQUEST LOGGING - Morgan
  // ─────────────────────────────────────────────────────────────────────────
  // Logs all HTTP requests in "combined" format (Apache-style):
  // :remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" 
  // :status :res[content-length] ":referrer" ":user-agent"
  // 
  // The stream is piped to Winston logger, which:
  // - Writes to both console and rotating log files
  // - Adds timestamps and colors
  // - Handles log rotation to prevent disk space issues
  app.use(morgan("combined", { stream: morganStream }));

  // ─────────────────────────────────────────────────────────────────────────
  // API DOCUMENTATION - Swagger UI
  // ─────────────────────────────────────────────────────────────────────────
  // Serves interactive API documentation at /api/docs
  // 
  // Features:
  // - Auto-generated from JSDoc comments in route handlers
  // - Try-it-out functionality for testing endpoints
  // - Shows request/response schemas
  // - Documents authentication requirements
  // 
  // Access at: http://localhost:4000/api/docs
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─────────────────────────────────────────────────────────────────────────
  // APPLICATION ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  // All API endpoints are mounted under /api prefix:
  // - POST /api/auth/login
  // - GET /api/devices
  // - GET /api/dashboard
  // - POST /api/upload
  // - GET /api/alerts
  // - And 15+ more endpoints (see routes/api.ts for complete list)
  app.use("/api", apiRouter);

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING MIDDLEWARE (Must be last!)
  // ─────────────────────────────────────────────────────────────────────────
  
  // 404 Handler - Catches requests to undefined routes
  // This executes if no previous route matched the request
  // Returns: { error: "Not Found", path: "/the/requested/path" }
  app.use(notFoundHandler);

  // Global Error Handler - Catches all errors thrown in route handlers
  // This provides centralized error formatting for:
  // - Validation errors (Zod schema failures)
  // - Database errors
  // - Authentication errors
  // - Any other thrown errors
  // 
  // Returns consistent error format:
  // { error: "Error message", details: {...} }
  app.use(errorHandler);

  // Return the fully configured app (but not started/listening yet)
  return app;
}
