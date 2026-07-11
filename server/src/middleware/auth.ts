import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../utils/http-error";
import type { AuthUser } from "../domain/types";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(unauthorized("Missing bearer token"));
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as AuthUser & {
      iat: number;
      exp: number;
    };
    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
    };
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!req.user.permissions.includes(permission)) {
      next(forbidden(`Missing permission: ${permission}`));
      return;
    }
    next();
  };
}
