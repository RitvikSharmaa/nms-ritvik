import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { HttpError } from "../utils/http-error";
import { logger } from "../config/logger";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new HttpError(400, "Validation failed", formatZod(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new HttpError(400, "Invalid query parameters", formatZod(result.error)));
      return;
    }
    Object.assign(req.query, result.data);
    next();
  };
}

function formatZod(error: ZodError): Array<{ path: string; message: string }> {
  return error.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details ?? null });
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error(err instanceof Error ? err : new Error(String(err)));
  res.status(500).json({ error: message, details: null });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found", details: null });
}
