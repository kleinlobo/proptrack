-- Migration: 0012_create_audit_logs.sql
-- Immutable log of all changes to financial tables. Written by DB triggers only.
-- No soft delete — audit records are permanent. No UPDATE/DELETE RLS policy.

CREATE TABLE public.audit_logs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL,
  action          VARCHAR(10)   NOT NULL,
  table_name      VARCHAR(100)  NOT NULL,
  record_id       UUID          NOT NULL,
  previous_value  JSONB,
  new_value       JSONB,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_action_check CHECK (action IN ('INSERT','UPDATE','DELETE'))
);

CREATE INDEX idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user         ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_created      ON public.audit_logs(created_at DESC);
