-- ============================================================
-- Schema Verification Script
-- Run this after applying migrations to verify everything is correct
-- ============================================================

-- Check all tables exist
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      'users', 'roles', 'permissions', 'role_permissions',
      'networks', 'links', 'devices', 'device_links',
      'metrics', 'alerts', 'alert_history',
      'uploads', 'reports', 'settings',
      'audit_logs', 'notification_history', 'system_logs', 'health_checks',
      'schema_migrations'
    ) THEN '✅'
    ELSE '❌'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check index count per table
SELECT 
  tablename,
  count(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;

-- Check constraints
SELECT 
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  contype AS constraint_type,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE contype::text
  END as type_name
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, type_name, constraint_name;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
    pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check applied migrations
SELECT name, applied_at FROM schema_migrations ORDER BY applied_at;

-- Verify settings singleton
SELECT count(*) as settings_row_count FROM settings;

-- Verify fixed networks
SELECT count(*) as network_count FROM networks;

-- Verify fixed links
SELECT count(*) as link_count FROM links;

-- Verify roles and permissions
SELECT 
  r.name as role,
  count(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.name;

-- Verify admin user exists
SELECT username, full_name, active FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
