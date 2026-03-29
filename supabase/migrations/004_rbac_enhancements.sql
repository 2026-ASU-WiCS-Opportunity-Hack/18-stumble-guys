-- ============================================================
-- 004_rbac_enhancements.sql
-- Adds: 'client' role, portal_user_id on clients, client_id on users,
--       metadata/page_path/actor_role on audit_logs, staff management RLS
-- ============================================================

-- 1. Expand role enum to include 'client'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'client'));

-- 2. Add client_id to users (for portal users linked to a client record)
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Add portal_user_id to clients (the auth user for this client's portal access)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Enrich audit_logs with detail fields
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS page_path text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role text;

-- 5. Allow admins to delete staff from same org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_delete_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_delete_admin" ON users
        FOR DELETE USING (
          org_id = get_my_org_id()
          AND get_my_role() = 'admin'
          AND id != auth.uid()
        )
    $policy$;
  END IF;
END $$;

-- 6. Allow admins to update any user in same org (role changes etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users_update_admin" ON users
        FOR UPDATE USING (
          org_id = get_my_org_id()
          AND get_my_role() = 'admin'
        )
    $policy$;
  END IF;
END $$;

-- 7. Index for audit log filtering
CREATE INDEX IF NOT EXISTS audit_logs_action_idx    ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx     ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_role_idx ON audit_logs (actor_role);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx   ON audit_logs (created_at DESC);
