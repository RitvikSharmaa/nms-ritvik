import winston from "winston";
import path from "path";
import { env } from "./env";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}] ${stack ?? message}`;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  format: combine(errors({ stack: true }), timestamp(), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), errors({ stack: true }), timestamp(), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(env.logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(env.logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};
