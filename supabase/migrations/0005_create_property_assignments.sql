-- Migration: 0005_create_property_assignments.sql
-- Many-to-many join between user_profiles and properties.

CREATE TABLE public.property_assignments (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  property_id UUID          NOT NULL REFERENCES public.properties(id)    ON DELETE CASCADE,
  assigned_by UUID          NOT NULL REFERENCES public.user_profiles(id),
  assigned_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT property_assignments_unique UNIQUE (user_id, property_id)
);

CREATE INDEX idx_pa_user     ON public.property_assignments(user_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_property ON public.property_assignments(property_id) WHERE deleted_at IS NULL;

-- Helper function: returns property IDs assigned to the currently authenticated user
-- SECURITY DEFINER to bypass RLS on property_assignments (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_my_property_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT property_id FROM public.property_assignments
    WHERE user_id = auth.uid()
  )
$$;
