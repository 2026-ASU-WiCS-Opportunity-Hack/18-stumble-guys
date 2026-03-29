-- ============================================================
-- 002_rls.sql — Row Level Security on every table
-- Run this AFTER 001_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;

-- Helper functions — MUST use SECURITY DEFINER to avoid circular RLS.
-- Without it: get_my_org_id() queries users → RLS fires → calls get_my_org_id() → infinite loop → NULL.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS entirely.
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- ─── organizations ───────────────────────────────────────────
-- Users can read their own org
CREATE POLICY "orgs_select" ON organizations
  FOR SELECT USING (id = get_my_org_id());

-- Only admins can update org settings
CREATE POLICY "orgs_update_admin" ON organizations
  FOR UPDATE USING (id = get_my_org_id() AND get_my_role() = 'admin');

-- ─── users ───────────────────────────────────────────────────
-- Can see colleagues in same org
CREATE POLICY "users_select_same_org" ON users
  FOR SELECT USING (org_id = get_my_org_id());

-- Any authenticated user can insert their OWN row (first login self-registration)
CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Can update own record only
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- Admin can insert other users into their org
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- ─── clients ─────────────────────────────────────────────────
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (org_id = get_my_org_id());

-- Only admins can delete clients
CREATE POLICY "clients_delete_admin" ON clients
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- ─── service_entries ─────────────────────────────────────────
CREATE POLICY "service_entries_select" ON service_entries
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "service_entries_insert" ON service_entries
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "service_entries_update" ON service_entries
  FOR UPDATE USING (org_id = get_my_org_id());

CREATE POLICY "service_entries_delete_admin" ON service_entries
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- ─── appointments ────────────────────────────────────────────
CREATE POLICY "appointments_select" ON appointments
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE USING (org_id = get_my_org_id());

CREATE POLICY "appointments_delete" ON appointments
  FOR DELETE USING (org_id = get_my_org_id());

-- ─── follow_ups ──────────────────────────────────────────────
CREATE POLICY "follow_ups_select" ON follow_ups
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "follow_ups_insert" ON follow_ups
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "follow_ups_update" ON follow_ups
  FOR UPDATE USING (org_id = get_my_org_id());

-- ─── audit_logs ──────────────────────────────────────────────
-- Everyone in org can read audit log, only system can insert
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- ─── ai_prompts ──────────────────────────────────────────────
CREATE POLICY "ai_prompts_select" ON ai_prompts
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "ai_prompts_manage_admin" ON ai_prompts
  FOR ALL USING (org_id = get_my_org_id() AND get_my_role() = 'admin');

-- ─── translations ────────────────────────────────────────────
-- Translations are global cache — any authenticated user can read/insert
CREATE POLICY "translations_select" ON translations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "translations_insert" ON translations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── documents ───────────────────────────────────────────────
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "documents_delete_admin" ON documents
  FOR DELETE USING (org_id = get_my_org_id() AND get_my_role() = 'admin');
