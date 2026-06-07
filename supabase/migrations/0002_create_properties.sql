-- Migration: 0002_create_properties.sql
-- Note: deleted_by FK to user_profiles added in 0016 (user_profiles created in 0004)
-- Note: base_currency is immutable after creation — enforced by trigger in 0016

CREATE TABLE public.properties (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id    UUID          NOT NULL REFERENCES public.countries(id),
  name          VARCHAR(255)  NOT NULL,
  address       TEXT,
  base_currency CHAR(3)       NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,
  CONSTRAINT properties_currency_check         CHECK (base_currency IN ('AED','INR')),
  CONSTRAINT properties_name_country_unique    UNIQUE (name, country_id)
);

CREATE INDEX idx_properties_country ON public.properties(country_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_active  ON public.properties(is_active)   WHERE deleted_at IS NULL;
