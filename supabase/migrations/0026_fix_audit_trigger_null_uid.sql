-- Migration: 0026_fix_audit_trigger_null_uid.sql
-- In Supabase, auth.uid() can return NULL inside SECURITY DEFINER triggers because
-- request.jwt.claims may not propagate into the trigger execution context.
-- Removing the COALESCE fallback in 0025 caused audit_logs.user_id NOT NULL to fail,
-- rolling back every UPDATE on financial tables (soft-deletes included).
--
-- Fix: restore COALESCE(auth.uid(), zero_uuid) so the NOT NULL constraint is always
-- satisfied, while actor_context = 'service_role/cron' flags the zero-UUID rows.

CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_uid   UUID := auth.uid();
  v_uid       UUID := COALESCE(v_raw_uid, '00000000-0000-0000-0000-000000000000'::UUID);
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
    CASE WHEN v_raw_uid IS NULL THEN 'service_role/cron' ELSE NULL END,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old_val,
    v_new_val
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
