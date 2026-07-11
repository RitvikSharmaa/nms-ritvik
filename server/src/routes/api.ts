import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { authenticate, requirePermission } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { authService } from "../services/auth.service";
import { uploadService } from "../services/upload.service";
import { dashboardService } from "../services/dashboard.service";
import { reportService } from "../services/report.service";
import { deviceRepository } from "../repositories/device.repository";
import {
  alertRepository,
  auditRepository,
  metricRepository,
  settingsRepository,
} from "../repositories/monitoring.repository";
import { userRepository } from "../repositories/user.repository";
import { badRequest, notFound } from "../utils/http-error";
import { NETWORK_NAMES, type NetworkName } from "../domain/types";

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

async function audit(req: Request, action: string, target: string, details = "") {
  await auditRepository.record({
    userId: req.user?.id ?? null,
    username: req.user?.username ?? "system",
    action,
    target,
    details,
    ipAddress: req.ip ?? "",
  });
}

export const apiRouter = Router();

/** @openapi /health: { get: { summary: Health check, security: [] } } */
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "healthy", at: new Date().toISOString() });
});

/** @openapi /auth/login: { post: { summary: Login, security: [] } } */
apiRouter.post(
  "/auth/login",
  validateBody(z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) })),
  wrap(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const result = await authService.login(username, password);
    await auditRepository.record({
      userId: result.user.id,
      username,
      action: "LOGIN",
      target: "session",
      details: "",
      ipAddress: req.ip ?? "",
    });
    res.json(result);
  }),
);

// everything below requires auth
apiRouter.use(authenticate);

/** @openapi /devices: { get: { summary: List devices (optionally by network) } } */
apiRouter.get(
  "/devices",
  requirePermission("devices:read"),
  wrap(async (req, res) => {
    const network = req.query.network as string | undefined;
    if (network && !(NETWORK_NAMES as readonly string[]).includes(network)) {
      throw badRequest("Unknown network");
    }
    const devices = network
      ? await deviceRepository.findByNetwork(network as NetworkName)
      : await deviceRepository.findAll();
    res.json(devices);
  }),
);

/** @openapi /devices/{id}/metrics: { get: { summary: Metric history for a device } } */
apiRouter.get(
  "/devices/:id/metrics",
  requirePermission("devices:read"),
  wrap(async (req, res) => {
    const device = await deviceRepository.findById(req.params.id);
    if (!device) throw notFound("Device not found");
    const hours = Math.min(Number(req.query.hours ?? 24) || 24, 24 * 31);
    const [history, uptime] = await Promise.all([
      metricRepository.historyForDevice(device.id, hours),
      metricRepository.uptimeForDevice(device.id, hours),
    ]);
    res.json({ device, uptime, history });
  }),
);

/** @openapi /metrics/latest: { get: { summary: Latest metric per device } } */
apiRouter.get(
  "/metrics/latest",
  requirePermission("devices:read"),
  wrap(async (_req, res) => {
    res.json(await metricRepository.latestPerDevice());
  }),
);

/** @openapi /dashboard: { get: { summary: Global + per-network stats } } */
apiRouter.get(
  "/dashboard",
  requirePermission("devices:read"),
  wrap(async (req, res) => {
    const hours = Math.min(Number(req.query.hours ?? 2) || 2, 168);
    const [networks, trend, problems] = await Promise.all([
      dashboardService.networkStats(),
      dashboardService.globalTrend(hours),
      dashboardService.topProblemDevices(10),
    ]);
    res.json({ networks, trend, topProblemDevices: problems });
  }),
);

const uploadMw = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** @openapi /upload: { post: { summary: Import devices from CSV/XLSX } } */
apiRouter.post(
  "/upload",
  requirePermission("devices:write"),
  uploadMw.single("file"),
  wrap(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded (field name: file)");
    const dryRun = req.query.dryRun === "true";
    const report = await uploadService.processFile(
      req.file.originalname,
      req.file.buffer,
      req.user?.id ?? null,
      dryRun,
    );
    if (!dryRun) {
      await audit(req, "DEVICE_IMPORT", req.file.originalname, `${report.successRows} imported`);
    }
    res.json(report);
  }),
);

/** @openapi /alerts: { get: { summary: List alerts with filters } } */
apiRouter.get(
  "/alerts",
  requirePermission("alerts:read"),
  wrap(async (req, res) => {
    res.json(
      await alertRepository.list({
        severity: req.query.severity as string | undefined,
        state: req.query.state as string | undefined,
        network: req.query.network as string | undefined,
        search: req.query.search as string | undefined,
        limit: Math.min(Number(req.query.limit ?? 200) || 200, 1000),
      }),
    );
  }),
);

/** @openapi /alerts/{id}/state: { patch: { summary: Acknowledge or resolve an alert } } */
apiRouter.patch(
  "/alerts/:id/state",
  requirePermission("alerts:write"),
  validateBody(z.object({ state: z.enum(["acknowledged", "resolved"]) })),
  wrap(async (req, res) => {
    const { state } = req.body as { state: "acknowledged" | "resolved" };
    const changed = await alertRepository.transition(req.params.id, state, req.user?.id ?? null);
    if (!changed) throw badRequest("Alert not found or already in that state");
    await audit(req, `ALERT_${state.toUpperCase()}`, req.params.id);
    res.json({ ok: true });
  }),
);

/** @openapi /reports/export: { get: { summary: Export report as csv|xlsx|pdf } } */
apiRouter.get(
  "/reports/export",
  requirePermission("reports:read"),
  wrap(async (req, res) => {
    const format = String(req.query.format ?? "csv");
    await audit(req, "REPORT_EXPORT", format);
    if (format === "csv") {
      res.type("text/csv").attachment("nms-report.csv").send(await reportService.csv());
    } else if (format === "xlsx") {
      res
        .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .attachment("nms-report.xlsx")
        .send(await reportService.xlsx());
    } else if (format === "pdf") {
      res.type("application/pdf").attachment("nms-report.pdf").send(await reportService.pdf());
    } else {
      throw badRequest("format must be csv, xlsx or pdf");
    }
  }),
);

/** @openapi /settings: { get: { summary: Get settings }, patch: { summary: Update settings } } */
apiRouter.get(
  "/settings",
  requirePermission("devices:read"),
  wrap(async (_req, res) => res.json(await settingsRepository.get()) as unknown as Promise<void>),
);

apiRouter.patch(
  "/settings",
  requirePermission("settings:write"),
  validateBody(
    z.object({
      poll_interval_sec: z.number().int().min(5).max(3600).optional(),
      latency_warn_ms: z.number().positive().optional(),
      latency_crit_ms: z.number().positive().optional(),
      packet_loss_warn_pct: z.number().min(0).max(100).optional(),
      packet_loss_crit_pct: z.number().min(0).max(100).optional(),
      bandwidth_warn_mbps: z.number().positive().optional(),
      snmp_community: z.string().min(1).max(100).optional(),
      snmp_version: z.enum(["v1", "v2c", "v3"]).optional(),
      retention_days: z.number().int().min(1).max(3650).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const updated = await settingsRepository.update(req.body);
    await audit(req, "SETTINGS_UPDATE", "settings", JSON.stringify(req.body));
    res.json(updated);
  }),
);

/** @openapi /users: { get: { summary: List users }, post: { summary: Create user } } */
apiRouter.get(
  "/users",
  requirePermission("users:write"),
  wrap(async (_req, res) => res.json(await userRepository.list()) as unknown as Promise<void>),
);

apiRouter.post(
  "/users",
  requirePermission("users:write"),
  validateBody(
    z.object({
      username: z.string().trim().min(1).max(100),
      fullName: z.string().trim().min(1).max(200),
      email: z.string().trim().email().max(255),
      password: z.string().min(8).max(200),
      role: z.enum(["admin", "operator", "viewer"]),
    }),
  ),
  wrap(async (req, res) => {
    const body = req.body as {
      username: string;
      fullName: string;
      email: string;
      password: string;
      role: string;
    };
    const existing = await userRepository.findByUsername(body.username);
    if (existing) throw badRequest("Username already exists");
    const passwordHash = await authService.hashPassword(body.password);
    const id = await userRepository.create({ ...body, passwordHash });
    await audit(req, "USER_CREATE", body.username, `role=${body.role}`);
    res.status(201).json({ id });
  }),
);

apiRouter.patch(
  "/users/:id",
  requirePermission("users:write"),
  validateBody(
    z.object({
      active: z.boolean().optional(),
      role: z.enum(["admin", "operator", "viewer"]).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const { active, role } = req.body as { active?: boolean; role?: string };
    if (active !== undefined) await userRepository.setActive(req.params.id, active);
    if (role !== undefined) await userRepository.setRole(req.params.id, role);
    await audit(req, "USER_UPDATE", req.params.id, JSON.stringify(req.body));
    res.json({ ok: true });
  }),
);

/** @openapi /audit-logs: { get: { summary: List audit logs } } */
apiRouter.get(
  "/audit-logs",
  requirePermission("audit:read"),
  wrap(async (req, res) => {
    res.json(await auditRepository.list(Math.min(Number(req.query.limit ?? 200) || 200, 1000)));
  }),
);
