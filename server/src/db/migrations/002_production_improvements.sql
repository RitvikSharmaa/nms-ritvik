-- ============================================================
-- Production Schema Improvements
-- Safe enhancements - backwards compatible
-- ============================================================

-- ============================================================
-- PART 1: MISSING INDEXES FOR PERFORMANCE
-- ============================================================

-- Users: frequently queried by username and email
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != '';
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active, last_login_at DESC);

-- Devices: improve query performance
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(device_name);
CREATE INDEX IF NOT EXISTS idx_devices_created ON devices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_updated ON devices(updated_at DESC);

-- Metrics: time-series query optimization
CREATE INDEX IF NOT EXISTS idx_metrics_polled_at ON metrics(polled_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_status ON metrics(status, polled_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_device_status ON metrics(device_id, status, polled_at DESC);

-- Partial index for recent metrics (hot data)
CREATE INDEX IF NOT EXISTS idx_metrics_recent ON metrics(device_id, polled_at DESC)
WHERE polled_at > now() - interval '7 days';

-- Alerts: improve filtering and dashboard queries
CREATE INDEX IF NOT EXISTS idx_alerts_network ON alerts(network_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, state) WHERE state != 'resolved';
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type, device_id) WHERE state != 'resolved';
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Alert history: for audit trail queries
CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON alert_history(alert_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(changed_by, changed_at DESC);

-- Uploads: track upload history
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_created ON uploads(created_at DESC);

-- Reports: track report generation
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(generated_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- Audit logs: performance for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

-- Notification history: track alert notifications
CREATE INDEX IF NOT EXISTS idx_notifications_alert ON notification_history(alert_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notification_history(sent_at DESC);

-- System logs: for debugging and monitoring
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component, created_at DESC);

-- Health checks: for monitoring dashboard
CREATE INDEX IF NOT EXISTS idx_health_component ON health_checks(component, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_status ON health_checks(status, checked_at DESC);

-- ============================================================
-- PART 2: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================

-- Users: email validation
ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
  CHECK (email = '' OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Users: password hash must not be empty
ALTER TABLE users ADD CONSTRAINT chk_users_password_not_empty
  CHECK (length(password_hash) >= 20);

-- Devices: mac address format (optional but if provided, must be valid)
ALTER TABLE devices ADD CONSTRAINT chk_devices_mac_format
  CHECK (mac_address = '' OR mac_address ~* '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$');

-- Metrics: latency must be non-negative
ALTER TABLE metrics ADD CONSTRAINT chk_metrics_latency_positive
  CHECK (latency_ms IS NULL OR latency_ms >= 0);

-- Metrics: packet loss must be between 0 and 100
ALTER TABLE metrics ADD CONSTRAINT chk_metrics_packet_loss_range
  CHECK (packet_loss >= 0 AND packet_loss <= 100);

-- Metrics: bandwidth must be non-negative
ALTER TABLE metrics ADD CONSTRAINT chk_metrics_bandwidth_positive
  CHECK (bandwidth_in >= 0 AND bandwidth_out >= 0);

-- Alerts: resolved_at must be after created_at
ALTER TABLE alerts ADD CONSTRAINT chk_alerts_resolved_after_created
  CHECK (resolved_at IS NULL OR resolved_at >= created_at);

-- Uploads: row counts must be consistent
ALTER TABLE uploads ADD CONSTRAINT chk_uploads_row_counts
  CHECK (success_rows + failed_rows <= total_rows);

-- Reports: range_end must be after range_start
ALTER TABLE reports ADD CONSTRAINT chk_reports_range_valid
  CHECK (range_end > range_start);

-- Settings: poll interval must be reasonable (5s to 1 hour)
ALTER TABLE settings ADD CONSTRAINT chk_settings_poll_interval
  CHECK (poll_interval_sec >= 5 AND poll_interval_sec <= 3600);

-- Settings: thresholds must be positive
ALTER TABLE settings ADD CONSTRAINT chk_settings_thresholds_positive
  CHECK (latency_warn_ms > 0 AND latency_crit_ms > 0 
    AND packet_loss_warn_pct >= 0 AND packet_loss_crit_pct >= 0
    AND bandwidth_warn_mbps > 0);

-- Settings: critical thresholds must be higher than warning
ALTER TABLE settings ADD CONSTRAINT chk_settings_thresholds_ordered
  CHECK (latency_crit_ms >= latency_warn_ms 
    AND packet_loss_crit_pct >= packet_loss_warn_pct);

-- Settings: retention must be at least 1 day
ALTER TABLE settings ADD CONSTRAINT chk_settings_retention
  CHECK (retention_days >= 1 AND retention_days <= 3650);

-- ============================================================
-- PART 3: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

-- These indexes improve JOIN performance and FK constraint checking
CREATE INDEX IF NOT EXISTS idx_device_links_device ON device_links(device_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_changed_by ON alert_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);

-- ============================================================
-- PART 4: ADD COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================

-- Dashboard: get latest metrics per device with status
CREATE INDEX IF NOT EXISTS idx_metrics_device_status_time 
  ON metrics(device_id, status, polled_at DESC);

-- Dashboard: get active alerts by network and severity
CREATE INDEX IF NOT EXISTS idx_alerts_network_severity_state 
  ON alerts(network_id, severity, state, created_at DESC);

-- Audit: search by user and action
CREATE INDEX IF NOT EXISTS idx_audit_user_action 
  ON audit_logs(user_id, action, created_at DESC);

-- ============================================================
-- PART 5: ADD GIN INDEXES FOR JSONB COLUMNS
-- ============================================================

-- Enable fast searches in JSONB columns
CREATE INDEX IF NOT EXISTS idx_uploads_error_report_gin 
  ON uploads USING gin(error_report);

CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin 
  ON notification_history USING gin(payload);

-- ============================================================
-- PART 6: TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE roles IS 'User roles (admin, operator, viewer)';
COMMENT ON TABLE permissions IS 'Granular permissions for role-based access';
COMMENT ON TABLE role_permissions IS 'Many-to-many mapping of roles to permissions';
COMMENT ON TABLE networks IS 'Fixed network topology (exactly 5 networks)';
COMMENT ON TABLE links IS 'Fixed link topology (exactly 3 links)';
COMMENT ON TABLE devices IS 'Network device inventory';
COMMENT ON TABLE device_links IS 'Many-to-many mapping of devices to links';
COMMENT ON TABLE metrics IS 'Time-series monitoring data (ICMP + SNMP)';
COMMENT ON TABLE alerts IS 'Network alerts with state machine (active/acknowledged/resolved)';
COMMENT ON TABLE alert_history IS 'Audit trail of alert state transitions';
COMMENT ON TABLE uploads IS 'Device import history with error reports';
COMMENT ON TABLE reports IS 'Generated report metadata';
COMMENT ON TABLE settings IS 'Singleton table for monitoring configuration';
COMMENT ON TABLE audit_logs IS 'User action audit trail';
COMMENT ON TABLE notification_history IS 'Alert notification delivery log';
COMMENT ON TABLE system_logs IS 'Application event logs';
COMMENT ON TABLE health_checks IS 'Component health status tracking';

-- Column comments for critical fields
COMMENT ON COLUMN metrics.polled_at IS 'Timestamp when device was probed';
COMMENT ON COLUMN metrics.bandwidth_in IS 'Inbound bandwidth in Mbps';
COMMENT ON COLUMN metrics.bandwidth_out IS 'Outbound bandwidth in Mbps';
COMMENT ON COLUMN metrics.snmp_in_octets IS 'Raw SNMP counter for bandwidth calculation';
COMMENT ON COLUMN metrics.snmp_out_octets IS 'Raw SNMP counter for bandwidth calculation';
COMMENT ON COLUMN alerts.state IS 'Alert lifecycle: active -> acknowledged -> resolved';
COMMENT ON COLUMN uploads.error_report IS 'JSONB array of validation errors per row';
COMMENT ON COLUMN settings.id IS 'Always 1 - singleton pattern for global config';

-- ============================================================
-- PART 7: ADD TABLE STATISTICS FOR QUERY PLANNER
-- ============================================================

-- Analyze tables to update statistics for optimal query planning
ANALYZE users;
ANALYZE devices;
ANALYZE device_links;
ANALYZE metrics;
ANALYZE alerts;
ANALYZE alert_history;
ANALYZE uploads;
ANALYZE reports;
ANALYZE audit_logs;
ANALYZE notification_history;
ANALYZE system_logs;
ANALYZE health_checks;
