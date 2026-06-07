-- Migration: 0013_create_financial_year_settings.sql

CREATE TABLE public.financial_year_settings (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  start_month SMALLINT  NOT NULL,
  start_day   SMALLINT  NOT NULL DEFAULT 1,
  label       VARCHAR(50),
  is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID      REFERENCES public.user_profiles(id),
  CONSTRAINT fy_month_range CHECK (start_month BETWEEN 1 AND 12),
  CONSTRAINT fy_day_range   CHECK (start_day   BETWEEN 1 AND 28),
  CONSTRAINT fy_one_active  UNIQUE (is_active)
);
