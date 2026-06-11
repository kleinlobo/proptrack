-- Migration: 0022_security_fix_privilege_and_assignments.sql
-- F1: Remove role escalation via signup metadata — hardcode 'read_only' for new users.
-- F2: Exclude soft-deleted assignments from get_my_property_ids().

-- ─────────────────────────────────────────────────────────────────────────────
-- F1: handle_new_user — never trust user-supplied role from raw_user_meta_data
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
    'read_only'
  );
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- F2: get_my_property_ids — filter out soft-deleted assignments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_property_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT property_id FROM public.property_assignments
    WHERE user_id = auth.uid()
      AND deleted_at IS NULL
  )
$$;
