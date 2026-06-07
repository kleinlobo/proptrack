-- Migration: 0010_create_exchange_rates.sql

CREATE TABLE public.exchange_rates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   CHAR(3)       NOT NULL,
  to_currency     CHAR(3)       NOT NULL,
  rate            DECIMAL(10,6) NOT NULL,
  effective_date  DATE          NOT NULL,
  is_manual       BOOLEAN       NOT NULL DEFAULT FALSE,
  overridden_by   UUID          REFERENCES public.user_profiles(id),
  source          VARCHAR(100),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT exchange_rates_unique   UNIQUE (from_currency, to_currency, effective_date),
  CONSTRAINT exchange_rate_positive  CHECK (rate > 0)
);

CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(effective_date DESC);
CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates(from_currency, to_currency);
