-- Migration: 0003_create_rooms.sql
-- Note: deleted_by FK to user_profiles added in 0016 (user_profiles created in 0004)

CREATE TABLE public.rooms (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID          NOT NULL REFERENCES public.properties(id),
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID,
  CONSTRAINT rooms_name_property_unique UNIQUE (name, property_id)
);

CREATE INDEX idx_rooms_property ON public.rooms(property_id) WHERE deleted_at IS NULL;
