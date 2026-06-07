-- Migration: 0016_create_triggers.sql
-- All trigger functions and triggers. Also completes any deferred FK constraints.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. handle_new_user: auto-create user_profiles row on auth.users INSERT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'read_only')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. protect_property_immutable_fields: prevent base_currency / country_id changes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_property_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.base_currency <> OLD.base_currency THEN
    RAISE EXCEPTION 'base_currency cannot be changed after property creation';
  END IF;
  IF NEW.country_id <> OLD.country_id THEN
    RAISE EXCEPTION 'country_id cannot be changed after property creation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_property_immutable_fields
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_currency();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. audit_financial_changes: append-only audit log for financial tables
-- Fallback UUID used when auth.uid() is NULL (cron / service_role context)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
    user_id, action, table_name, record_id, previous_value, new_value
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old_val,
    v_new_val
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_income_records
  AFTER INSERT OR UPDATE OR DELETE ON public.income_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

CREATE TRIGGER audit_expense_records
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

CREATE TRIGGER audit_recurring_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_changes();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. notify_large_expense: notify super_admins when amount_base exceeds threshold
-- Thresholds: AED 5,000 | INR 100,000
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_large_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold DECIMAL(12,2);
  v_property  public.properties%ROWTYPE;
  v_admin     RECORD;
BEGIN
  SELECT * INTO v_property FROM public.properties WHERE id = NEW.property_id;

  v_threshold := CASE v_property.base_currency
    WHEN 'AED' THEN 5000.00
    WHEN 'INR' THEN 100000.00
    ELSE 5000.00
  END;

  IF NEW.amount_base >= v_threshold AND NEW.status = 'confirmed' THEN
    FOR v_admin IN
      SELECT id FROM public.user_profiles
      WHERE role = 'super_admin' AND deleted_at IS NULL AND is_active = TRUE
    LOOP
      INSERT INTO public.notifications (
        user_id, type, title, body, related_entity_type, related_entity_id
      ) VALUES (
        v_admin.id,
        'large_expense',
        'Large expense recorded',
        v_property.base_currency || ' ' || NEW.amount_base ||
          ' expense recorded for ' || v_property.name,
        'expense_records',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_large_expense
  AFTER INSERT OR UPDATE ON public.expense_records
  FOR EACH ROW EXECUTE FUNCTION public.notify_large_expense();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. notify_recurring_due: notify assigned managers when recurring expense created
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_recurring_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager RECORD;
  v_prop    public.properties%ROWTYPE;
BEGIN
  IF NEW.is_recurring = TRUE AND NEW.status = 'pending_confirmation' THEN
    SELECT * INTO v_prop FROM public.properties WHERE id = NEW.property_id;

    FOR v_manager IN
      SELECT up.id
      FROM public.property_assignments pa
      JOIN public.user_profiles up ON up.id = pa.user_id
      WHERE pa.property_id = NEW.property_id
        AND pa.deleted_at IS NULL
        AND up.deleted_at IS NULL
        AND up.is_active = TRUE
    LOOP
      INSERT INTO public.notifications (
        user_id, type, title, body, related_entity_type, related_entity_id
      ) VALUES (
        v_manager.id,
        'recurring_due',
        'Recurring expense ready for confirmation',
        'Please confirm the recurring expense for ' || v_prop.name,
        'expense_records',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recurring_expense_created
  AFTER INSERT ON public.expense_records
  FOR EACH ROW EXECUTE FUNCTION public.notify_recurring_due();
