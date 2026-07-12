-- ============================================================
-- Optional: Metrics Table Partitioning for Scalability
-- This migration is OPTIONAL and should only be applied if:
-- 1. You have 1000+ devices
-- 2. Metrics table exceeds 10M rows
-- 3. Query performance is degrading
-- ============================================================

-- IMPORTANT: This migration requires downtime and data migration
-- Do NOT run this in production without testing and planning
-- Uncomment the code below when ready to implement

/*
-- ============================================================
-- STEP 1: Rename existing metrics table
-- ============================================================

ALTER TABLE metrics RENAME TO metrics_old;

-- ============================================================
-- STEP 2: Create new partitioned metrics table
-- ============================================================

CREATE TABLE metrics (
  id            BIGSERIAL,
  device_id     UUID NOT NULL,
  network_id    INT  NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('up','degraded','down')),
  latency_ms    REAL,
  packet_loss   REAL NOT NULL DEFAULT 0,
  bandwidth_in  REAL NOT NULL DEFAULT 0,
  bandwidth_out REAL NOT NULL DEFAULT 0,
  snmp_in_octets  BIGINT,
  snmp_out_octets BIGINT,
  polled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, polled_at)
) PARTITION BY RANGE (polled_at);

-- Add foreign keys (cannot be done on partitioned table directly)
-- Will be added to individual partitions

-- ============================================================
-- STEP 3: Create initial partitions (monthly)
-- ============================================================

-- Current month
CREATE TABLE metrics_2026_07 PARTITION OF metrics
FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Next 6 months
CREATE TABLE metrics_2026_08 PARTITION OF metrics
FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE metrics_2026_09 PARTITION OF metrics
FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE metrics_2026_10 PARTITION OF metrics
FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE metrics_2026_11 PARTITION OF metrics
FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE metrics_2026_12 PARTITION OF metrics
FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE metrics_2027_01 PARTITION OF metrics
FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

-- ============================================================
-- STEP 4: Add indexes to each partition
-- ============================================================

DO $$
DECLARE
  partition_name TEXT;
BEGIN
  FOR partition_name IN 
    SELECT tablename FROM pg_tables 
    WHERE tablename LIKE 'metrics_20%'
  LOOP
    -- Device + time index
    EXECUTE format('CREATE INDEX idx_%s_device_time ON %s(device_id, polled_at DESC)', 
      partition_name, partition_name);
    
    -- Network + time index
    EXECUTE format('CREATE INDEX idx_%s_network_time ON %s(network_id, polled_at DESC)', 
      partition_name, partition_name);
    
    -- Status index
    EXECUTE format('CREATE INDEX idx_%s_status ON %s(status, polled_at DESC)', 
      partition_name, partition_name);
    
    -- Time-only index
    EXECUTE format('CREATE INDEX idx_%s_polled_at ON %s(polled_at DESC)', 
      partition_name, partition_name);
      
    -- Foreign key indexes
    EXECUTE format('CREATE INDEX idx_%s_device_id ON %s(device_id)', 
      partition_name, partition_name);
      
    EXECUTE format('CREATE INDEX idx_%s_network_id ON %s(network_id)', 
      partition_name, partition_name);
  END LOOP;
END $$;

-- ============================================================
-- STEP 5: Migrate data from old table (in batches)
-- ============================================================

-- This can take a LONG time for large tables
-- Consider running this in batches during off-peak hours

DO $$
DECLARE
  batch_size INT := 10000;
  total_rows BIGINT;
  processed BIGINT := 0;
BEGIN
  SELECT count(*) INTO total_rows FROM metrics_old;
  
  RAISE NOTICE 'Migrating % rows in batches of %', total_rows, batch_size;
  
  WHILE processed < total_rows LOOP
    INSERT INTO metrics 
    SELECT * FROM metrics_old 
    WHERE id > processed 
    ORDER BY id 
    LIMIT batch_size;
    
    processed := processed + batch_size;
    
    RAISE NOTICE 'Migrated % of % rows (%.2f%%)', 
      LEAST(processed, total_rows), 
      total_rows, 
      (LEAST(processed, total_rows)::FLOAT / total_rows * 100);
    
    -- Commit each batch
    COMMIT;
  END LOOP;
  
  RAISE NOTICE 'Migration complete!';
END $$;

-- ============================================================
-- STEP 6: Verify data migration
-- ============================================================

DO $$
DECLARE
  old_count BIGINT;
  new_count BIGINT;
BEGIN
  SELECT count(*) INTO old_count FROM metrics_old;
  SELECT count(*) INTO new_count FROM metrics;
  
  IF old_count != new_count THEN
    RAISE EXCEPTION 'Row count mismatch! Old: %, New: %', old_count, new_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: % rows migrated successfully', new_count;
END $$;

-- ============================================================
-- STEP 7: Drop old table (only after verification)
-- ============================================================

-- Backup first!
-- pg_dump -t metrics_old your_database > metrics_old_backup.sql

-- Then drop (uncomment when ready)
-- DROP TABLE metrics_old;

-- ============================================================
-- STEP 8: Create function to auto-create future partitions
-- ============================================================

CREATE OR REPLACE FUNCTION create_metrics_partition()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  -- Create partition for next month
  partition_date := date_trunc('month', now() + interval '2 months');
  partition_name := 'metrics_' || to_char(partition_date, 'YYYY_MM');
  start_date := to_char(partition_date, 'YYYY-MM-DD');
  end_date := to_char(partition_date + interval '1 month', 'YYYY-MM-DD');
  
  -- Check if partition already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %s PARTITION OF metrics FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    -- Create indexes
    EXECUTE format('CREATE INDEX idx_%s_device_time ON %s(device_id, polled_at DESC)', 
      partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_network_time ON %s(network_id, polled_at DESC)', 
      partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_status ON %s(status, polled_at DESC)', 
      partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_polled_at ON %s(polled_at DESC)', 
      partition_name, partition_name);
    
    RAISE NOTICE 'Created partition % for range % to %', partition_name, start_date, end_date;
  END IF;
END;
$$;

-- ============================================================
-- STEP 9: Schedule monthly partition creation
-- ============================================================

-- Option A: Use pg_cron extension (if available)
-- SELECT cron.schedule('create-metrics-partition', '0 0 1 * *', 'SELECT create_metrics_partition()');

-- Option B: Run manually each month
-- SELECT create_metrics_partition();

-- Option C: Call from application cron job

-- ============================================================
-- STEP 10: Create function to drop old partitions
-- ============================================================

CREATE OR REPLACE FUNCTION drop_old_metrics_partitions(retention_months INT DEFAULT 6)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
BEGIN
  cutoff_date := date_trunc('month', now() - (retention_months || ' months')::interval);
  
  FOR partition_record IN
    SELECT tablename FROM pg_tables
    WHERE tablename LIKE 'metrics_20%'
    AND tablename < 'metrics_' || to_char(cutoff_date, 'YYYY_MM')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %s', partition_record.tablename);
    RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
  END LOOP;
END;
$$;

-- ============================================================
-- USAGE NOTES
-- ============================================================

-- To create next month's partition:
-- SELECT create_metrics_partition();

-- To drop partitions older than 6 months:
-- SELECT drop_old_metrics_partitions(6);

-- To check partition sizes:
-- SELECT
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE tablename LIKE 'metrics_%'
-- ORDER BY tablename DESC;

*/

-- ============================================================
-- END OF OPTIONAL PARTITIONING MIGRATION
-- ============================================================

-- This file is commented out by default
-- Review and test thoroughly before enabling
