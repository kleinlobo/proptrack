-- Migration: 0004_create_user_profiles.sql
-- Extends auth.users with role and display info.
-- Also creates helper functions used by all RLS policies.

CREATE TABLE public.user_profiles (
  id         UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  VARCHAR(255)  NOT NULL,
  role       VARCHAR(20)   NOT NULL DEFAULT 'read_only',
  is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT user_profiles_role_check CHECK (role IN ('super_admin','property_manager','read_only'))
);

CREATE INDEX idx_user_profiles_role   ON public.user_profiles(role)      WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_active ON public.user_profiles(is_active)  WHERE deleted_at IS NULL;

-- Now that user_profiles exists, add the deferred FK constraints for countries, properties, rooms
ALTER TABLE public.countries  ADD CONSTRAINT fk_countries_deleted_by  FOREIGN KEY (deleted_by) REFERENCES public.user_profiles(id);
ALTER TABLE public.properties ADD CONSTRAINT fk_properties_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.user_profiles(id);
ALTER TABLE public.rooms      ADD CONSTRAINT fk_rooms_deleted_by      FOREIGN KEY (deleted_by) REFERENCES public.user_profiles(id);

-- Helper function: returns the role of the currently authenticated user
-- SECURITY DEFINER to bypass RLS on user_profiles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
$$;

-- Note: get_my_property_ids() is defined in 0005 after property_assignments table is created
