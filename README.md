# NetPulse NMS — Enterprise Network Monitoring System

A production-grade Network Operations Center (NOC) platform for **offline, air-gapped private clouds**. No SaaS, no cloud APIs, no internet dependency.

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | React 19 + TypeScript frontend (TanStack Router/Query, Tailwind, shadcn, Recharts, Framer Motion) |
| `src/lib/nms/` | Domain types, CSV/XLSX import validation, and an in-browser **simulation engine** that emulates the 30s ICMP/SNMP monitoring cycle so the dashboard is fully usable without the backend |
| `server/` | Production backend: Express + TypeScript, PostgreSQL, Socket.IO, node-cron, worker_threads, `ping` (ICMP), `net-snmp` (SNMP), Multer/csv-parser/xlsx uploads, JWT + bcrypt auth, Helmet, Winston, Morgan, Swagger |
| `server/src/db/migrations/` | Full normalized schema (17 tables) + fixed-data seeds |
| `docker-compose.yml`, `Dockerfile.frontend`, `server/Dockerfile`, `nginx/` | Air-gapped deployment stack |

## Fixed topology rules (enforced in DB + code)

- Exactly **five networks**: `Network-1 … Network-5` (seeded, CHECK-constrained; cannot be created/deleted).
- Exactly **three links**: `Link-1 … Link-3`. Device↔link is a proper many-to-many via the `device_links` junction table — never comma-separated strings.
- Every device belongs to exactly one network (`devices.network_id` FK).

## CSV / Excel import

Columns: `Username, IP Address, Device Name, Link, Network Name`. The `Link` column accepts any comma-separated combination of the three links. The pipeline validates required fields, IPv4/IPv6 format, duplicate IPs and device names (within the file **and** against inventory), unknown networks/links; splits links into junction rows; and persists a per-upload report (`uploads.error_report`). Both the frontend preview (drag-and-drop, dry-run) and the backend `POST /api/upload` (Multer + csv-parser + xlsx, `?dryRun=true` supported) implement the same rules.

## Monitoring engine (backend)

Every 30 s (configurable in `settings`): node-cron fires → devices partitioned per network → **one worker thread per network** runs ICMP (`ping`, latency/packet-loss/status) and SNMP (`net-snmp`, ifInOctets/ifOutOctets with counter-wrap-safe delta → Mbps) in parallel → metrics batch-inserted → threshold rule engine raises/dedupes/auto-resolves alerts → results broadcast over Socket.IO (`metrics:cycle`, `alert:new`, `devices:imported`). A nightly retention job prunes metrics past `retention_days`.

## Database (PostgreSQL 14+)

Tables: `users, roles, permissions, role_permissions, networks, links, devices, device_links, metrics, alerts, alert_history, uploads, reports, settings, audit_logs, notification_history, system_logs, health_checks` — see `server/src/db/migrations/001_init.sql` for full DDL, indexes, constraints and seeds. Forward-only migration runner: `server/src/db/migrate.ts` (tracked in `schema_migrations`; also creates the initial admin from `ADMIN_USERNAME`/`ADMIN_PASSWORD`).

## API

JWT bearer auth (`POST /api/auth/login`), role-based permissions (admin/operator/viewer). Key endpoints: `/api/devices`, `/api/devices/:id/metrics`, `/api/metrics/latest`, `/api/dashboard`, `/api/upload`, `/api/alerts`, `/api/alerts/:id/state`, `/api/reports/export?format=csv|xlsx|pdf`, `/api/settings`, `/api/users`, `/api/audit-logs`, `/api/health`. Interactive docs: **`/api/docs`** (Swagger UI). All mutations are written to `audit_logs`.

## Air-gapped deployment

1. On a connected build host: `docker compose build`, then `docker save` the images (`api`, `frontend`, `nginx`, `postgres:16-alpine`) to tarballs.
2. Transfer tarballs into the private cloud; `docker load` them.
3. Copy `server/.env.example` → `server/.env`; set `JWT_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL`, SNMP community.
4. `docker compose up -d` — nginx serves the app on port 80, proxies `/api` and `/socket.io` to the API. Migrations run automatically on API boot. The API container needs `NET_RAW` (already in compose) for ICMP.

Local backend dev: `cd server && npm install && npm run dev` (requires a local PostgreSQL and the `DATABASE_URL` env var).

## Frontend dev / preview

`npm run dev` (or the Lovable preview). Without `VITE_API_URL` the UI runs on the built-in simulation engine — every page (Dashboard, Network-1…5, Upload, Alerts, Reports, Comparison, Settings, Users, Audit Logs) is fully interactive with live 30 s updates, and Reports exports real PDF/XLSX/CSV files.
