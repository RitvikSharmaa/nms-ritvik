import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function toInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`Environment variable ${name} must be an integer`);
  return n;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt("PORT", 4000),
  databaseUrl: required("DATABASE_URL", "postgres://nms:nms_secret@localhost:5432/nms"),
  jwtSecret: required("JWT_SECRET", "dev-only-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  bcryptRounds: toInt("BCRYPT_ROUNDS", 12),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "ChangeMe!2024",
  pollIntervalSeconds: toInt("POLL_INTERVAL_SECONDS", 30),
  icmpPacketCount: toInt("ICMP_PACKET_COUNT", 4),
  icmpTimeoutSeconds: toInt("ICMP_TIMEOUT_SECONDS", 2),
  snmpCommunity: process.env.SNMP_COMMUNITY ?? "public",
  snmpPort: toInt("SNMP_PORT", 161),
  snmpTimeoutMs: toInt("SNMP_TIMEOUT_MS", 1500),
  workerPoolSize: toInt("WORKER_POOL_SIZE", 5),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  logLevel: process.env.LOG_LEVEL ?? "info",
  logDir: process.env.LOG_DIR ?? "./logs",
} as const;
