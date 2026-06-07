-- Migration: 0001_create_countries.sql
-- Note: deleted_by FK to user_profiles added in 0016 (user_profiles created in 0004)

CREATE TABLE public.countries (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100)  NOT NULL,
  code          CHAR(2)       NOT NULL,
  base_currency CHAR(3)       NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,
  CONSTRAINT countries_name_unique     UNIQUE (name),
  CONSTRAINT countries_code_unique     UNIQUE (code),
  CONSTRAINT countries_currency_check  CHECK (base_currency IN ('AED','INR'))
);

CREATE INDEX idx_countries_deleted ON public.countries(deleted_at) WHERE deleted_at IS NULL;
