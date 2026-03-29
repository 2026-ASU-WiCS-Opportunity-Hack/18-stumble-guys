-- ============================================================
-- Migration 005 — Audit log 90-day retention
--
-- STEP 1: Run this block first (no extensions needed)
-- ============================================================

-- Deletes audit_logs older than 90 days
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Run immediately to clean up any existing old records
SELECT purge_old_audit_logs();


-- ============================================================
-- STEP 2: Enable pg_cron FIRST, then run this block
--
-- How to enable pg_cron:
--   Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- After enabling, run this in SQL Editor:
-- ============================================================

/*
SELECT cron.schedule(
  'purge-old-audit-logs',       -- unique job name
  '0 3 * * *',                  -- every day at 03:00 UTC
  $$SELECT purge_old_audit_logs()$$
);
*/


-- ============================================================
-- ALTERNATIVE: If you don't want pg_cron, use a database trigger
-- that auto-deletes old rows whenever a new audit log is inserted.
-- This requires no extensions at all.
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_purge_old_audit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup 1% of the time to avoid overhead on every insert
  IF random() < 0.01 THEN
    DELETE FROM audit_logs
    WHERE created_at < now() - INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_old_audit_logs ON audit_logs;
CREATE TRIGGER trg_purge_old_audit_logs
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_purge_old_audit_logs();
