-- ============================================================
-- Enterprise NMS - initial schema
-- PostgreSQL 14+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- roles & permissions ----------
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,          -- admin | operator | viewer
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,          -- e.g. devices:write
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role_id       INT NOT NULL REFERENCES roles(id),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- fixed networks (exactly five) ----------
CREATE TABLE IF NOT EXISTS networks (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (name IN
    ('Network-1','Network-2','Network-3','Network-4','Network-5'))
);

-- ---------- fixed links (exactly three) ----------
CREATE TABLE IF NOT EXISTS links (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('Link-1','Link-2','Link-3'))
);

-- ---------- devices ----------
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL,
  ip_address  INET NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  hostname    TEXT NOT NULL DEFAULT '',
  network_id  INT NOT NULL REFERENCES networks(id),
  vendor      TEXT NOT NULL DEFAULT 'Unknown',
  model       TEXT NOT NULL DEFAULT '',
  mac_address TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network_id, device_name)
);
CREATE INDEX IF NOT EXISTS idx_devices_network ON devices(network_id);

-- ---------- device <-> link junction (many-to-many) ----------
CREATE TABLE IF NOT EXISTS device_links (
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  link_id   INT  NOT NULL REFERENCES links(id)   ON DELETE CASCADE,
  PRIMARY KEY (device_id, link_id)
);
CREATE INDEX IF NOT EXISTS idx_device_links_link ON device_links(link_id);

-- ---------- metrics (time-series) ----------
CREATE TABLE IF NOT EXISTS metrics (
  id            BIGSERIAL PRIMARY KEY,
  device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  network_id    INT  NOT NULL REFERENCES networks(id),
  status        TEXT NOT NULL CHECK (status IN ('up','degraded','down')),
  latency_ms    REAL,
  packet_loss   REAL NOT NULL DEFAULT 0,
  bandwidth_in  REAL NOT NULL DEFAULT 0,     -- Mbps
  bandwidth_out REAL NOT NULL DEFAULT 0,     -- Mbps
  snmp_in_octets  BIGINT,
  snmp_out_octets BIGINT,
  polled_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, polled_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_network_time ON metrics(network_id, polled_at DESC);

-- ---------- alerts ----------
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  network_id  INT  NOT NULL REFERENCES networks(id),
  severity    TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'active'
              CHECK (state IN ('active','acknowledged','resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id);

CREATE TABLE IF NOT EXISTS alert_history (
  id         BIGSERIAL PRIMARY KEY,
  alert_id   UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state   TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note       TEXT NOT NULL DEFAULT ''
);

-- ---------- uploads ----------
CREATE TABLE IF NOT EXISTS uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     TEXT NOT NULL,
  uploaded_by   UUID REFERENCES users(id),
  total_rows    INT NOT NULL DEFAULT 0,
  success_rows  INT NOT NULL DEFAULT 0,
  failed_rows   INT NOT NULL DEFAULT 0,
  error_report  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period       TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly','custom')),
  format       TEXT NOT NULL CHECK (format IN ('pdf','xlsx','csv')),
  range_start  TIMESTAMPTZ NOT NULL,
  range_end    TIMESTAMPTZ NOT NULL,
  generated_by UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- settings (single row) ----------
CREATE TABLE IF NOT EXISTS settings (
  id                    INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  poll_interval_sec     INT  NOT NULL DEFAULT 30,
  latency_warn_ms       REAL NOT NULL DEFAULT 80,
  latency_crit_ms       REAL NOT NULL DEFAULT 150,
  packet_loss_warn_pct  REAL NOT NULL DEFAULT 2,
  packet_loss_crit_pct  REAL NOT NULL DEFAULT 10,
  bandwidth_warn_mbps   REAL NOT NULL DEFAULT 850,
  snmp_community        TEXT NOT NULL DEFAULT 'public',
  snmp_version          TEXT NOT NULL DEFAULT 'v2c',
  retention_days        INT  NOT NULL DEFAULT 90,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- audit / notifications / system logs / health ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  username   TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  target     TEXT NOT NULL DEFAULT '',
  details    TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_history (
  id         BIGSERIAL PRIMARY KEY,
  alert_id   UUID REFERENCES alerts(id) ON DELETE SET NULL,
  channel    TEXT NOT NULL DEFAULT 'socket',
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id         BIGSERIAL PRIMARY KEY,
  level      TEXT NOT NULL,
  component  TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_checks (
  id           BIGSERIAL PRIMARY KEY,
  component    TEXT NOT NULL,           -- api | database | scheduler | worker-N
  status       TEXT NOT NULL,           -- healthy | degraded | failed
  detail       TEXT NOT NULL DEFAULT '',
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Seed fixed data
-- ============================================================

INSERT INTO roles (name, description) VALUES
  ('admin',    'Full administrative access'),
  ('operator', 'Manage devices, uploads and alerts'),
  ('viewer',   'Read-only dashboard access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('devices:read',   'View devices and metrics'),
  ('devices:write',  'Create/import devices'),
  ('alerts:read',    'View alerts'),
  ('alerts:write',   'Acknowledge/resolve alerts'),
  ('reports:read',   'Generate and export reports'),
  ('settings:write', 'Modify monitoring settings'),
  ('users:write',    'Manage user accounts'),
  ('audit:read',     'View audit logs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('devices:read','devices:write','alerts:read','alerts:write','reports:read')
WHERE r.name = 'operator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN
  ('devices:read','alerts:read','reports:read')
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- exactly five fixed networks
INSERT INTO networks (name) VALUES
  ('Network-1'), ('Network-2'), ('Network-3'), ('Network-4'), ('Network-5')
ON CONFLICT (name) DO NOTHING;

-- exactly three fixed links
INSERT INTO links (name) VALUES ('Link-1'), ('Link-2'), ('Link-3')
ON CONFLICT (name) DO NOTHING;

-- settings singleton
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
