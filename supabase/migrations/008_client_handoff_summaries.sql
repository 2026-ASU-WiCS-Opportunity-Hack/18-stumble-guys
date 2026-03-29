-- ============================================================
-- Migration 008 — Persistent AI handoff summaries
--
-- Stores one summary per client (UNIQUE on client_id).
-- Staleness is detected by comparing generated_at against
-- the latest service_entry created_at — if any entry was
-- added after the summary was generated, it is stale.
-- ============================================================

CREATE TABLE client_handoff_summaries (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid         NOT NULL REFERENCES clients(id)        ON DELETE CASCADE,
  org_id        uuid         NOT NULL REFERENCES organizations(id)   ON DELETE CASCADE,
  summary_text  text         NOT NULL,
  generated_by  uuid         REFERENCES users(id) ON DELETE SET NULL,
  generated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (client_id)   -- one active summary per client; upsert replaces it
);

ALTER TABLE client_handoff_summaries ENABLE ROW LEVEL SECURITY;

-- Staff / admin: full access within their org
CREATE POLICY "org members manage summaries"
ON client_handoff_summaries
USING  (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
