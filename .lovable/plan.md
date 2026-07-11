# Enterprise Network Monitoring System (NMS)

## Platform reality check (read this first)

This Lovable project runs a React + TypeScript + Vite frontend with the TanStack Start framework (TanStack Router — the modern equivalent of React Router, same ecosystem). The live preview **cannot** run a standalone Express server, PostgreSQL instance, raw ICMP/SNMP sockets, or Docker — those only exist once you deploy on your own infrastructure.

So the deliverable is a single repository with two halves:

1. **A fully working NOC dashboard you can use in the preview right now** — powered by a built-in simulation engine that emulates the 30-second monitoring cycle (ICMP latency, packet loss, SNMP bandwidth counters, status transitions, alert generation) with realistic, deterministic data streams. Every page, chart, upload flow, and real-time update works live in the preview.
2. **The complete production backend under `server/`** — Express + TypeScript + PostgreSQL + Socket.IO + node-cron + worker_threads + net-snmp + ping, plus Dockerfiles, docker-compose, Nginx config, SQL migrations, and full documentation for your air-gapped deployment. The frontend has an API layer with a single switch: simulation mode (preview) or real REST/Socket.IO mode (your private cloud).

Nothing uses any cloud service, SaaS, or internet API.

## Part 1 — Frontend (runs in preview)

**Design**: dark-mode enterprise NOC aesthetic — deep slate/graphite surfaces, glassmorphism panels, a restrained cyan/emerald/amber/red status palette, monospace metrics, professional typography, Framer Motion micro-animations, collapsible sidebar, sticky header.

**Pages** (each a separate route):
- **Dashboard** — KPI cards (total/online/offline devices, avg latency, packet loss, uptime, bandwidth, alerts), live latency/bandwidth/packet-loss trend charts (Recharts), recent alerts, top problem devices.
- **Network-1 … Network-5** — one route per fixed network: device table with status, hostname, IP, links, latency, packet loss, bandwidth in/out, uptime, health score, last poll; search, filter, sort, pagination.
- **Device drawer** — click any device: full details, historical graphs, vendor/model/MAC, assigned links.
- **Upload Devices** — drag-and-drop CSV/XLSX, client-side parse and preview, per-row validation (IP format, duplicate IPs/devices, valid networks, valid links, comma-split multi-links), import report with success/failure breakdown.
- **Alerts** — critical/warning/info/resolved tabs, filter/sort/search, acknowledge & resolve.
- **Reports** — daily/weekly/monthly/custom ranges, export CSV, Excel (xlsx), and PDF.
- **Comparison** — radar chart, bar charts, heatmap, ranking table across the 5 networks.
- **Settings** — thresholds (latency, packet loss, bandwidth), polling interval, SNMP defaults.
- **Users** & **Audit Logs** — role-based user management UI and audit trail views.

**Data layer**: typed domain models shared with the backend contract; TanStack Query + a repository-pattern API client (Axios) that targets either the in-browser simulation engine or `VITE_API_URL` for the real backend; simulated Socket.IO-style event bus drives live updates every 30 s with no manual refresh.

**Fixed entities enforced everywhere**: exactly 5 networks and 3 links (Link-1/2/3), no create/delete, device→network is one-to-one, device→links is many-to-many.

## Part 2 — Production backend (`server/`, for your air-gapped deployment)

- **Express + TypeScript** layered architecture: routes → controllers → services → repositories, with Zod validation, Helmet, Morgan, Winston logging, centralized error handling, Swagger docs at `/api/docs`.
- **PostgreSQL schema + migrations**: users, roles, permissions, networks (seeded with the 5 fixed), links (seeded with the 3 fixed), devices, `device_links` junction (never comma-separated strings), metrics, alerts, alert_history, uploads, reports, settings, audit_logs, notification_history, system_logs, health_checks.
- **Auth**: JWT + bcrypt, role-based access (admin/operator/viewer), audit logging on mutations.
- **Monitoring engine**: node-cron every 30 s → 5 worker threads (one per network) → ICMP via `ping`, SNMP via `net-snmp` (ifInOctets/ifOutOctets with counter-delta bandwidth), metrics insert, threshold rule engine → alerts → Socket.IO broadcast.
- **Upload module**: Multer + csv-parser + xlsx, full validation pipeline, junction-table link mapping, per-upload report persisted.
- **Reports**: PDFKit + ExcelJS + CSV generation endpoints.
- **Deployment**: Dockerfile (frontend), Dockerfile (backend), docker-compose.yml (nginx + api + postgres), nginx.conf with API/WebSocket proxying, `.env.example`.
- **Docs**: README, API docs, database docs, deployment guide (air-gapped instructions), developer guide.

## Build order

1. Design system + layout shell (sidebar, header, routes)
2. Domain types, simulation engine, API/repository layer
3. Dashboard, network pages, device drawer
4. Upload, Alerts, Reports, Comparison, Settings, Users, Audit Logs
5. Complete `server/` backend + SQL + Docker + Nginx
6. Documentation set

## Technical notes

- Frontend uses TanStack Router/Query (the platform's routing stack — API-compatible in spirit with React Router; all your other frontend choices are used as specified).
- The `server/` code is complete and compilable but is not executed by the Lovable preview; it's your deployment artifact.
- Real ICMP/SNMP require the backend to run on a host with network access to the monitored devices (raw socket / UDP 161), which Docker on your private cloud provides.
