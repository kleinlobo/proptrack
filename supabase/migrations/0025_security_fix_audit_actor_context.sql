-- Migration: 0025_security_fix_audit_actor_context.sql
-- F9: Add actor_context column to audit_logs to distinguish cron/service_role
-- actions from authenticated user actions. Updates the trigger function.

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_context TEXT;

CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_record_id UUID;
  v_old_val   JSONB;
  v_new_val   JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_val   := NULL;
    v_new_val   := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_old_val   := to_jsonb(OLD);
    v_new_val   := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_val   := to_jsonb(OLD);
    v_new_val   := NULL;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, actor_context, action, table_name, record_id, previous_value, new_value
  ) VALUES (
    v_uid,
    CASE WHEN v_uid IS NULL THEN 'service_role/cron' ELSE NULL END,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old_val,
    v_new_val
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
