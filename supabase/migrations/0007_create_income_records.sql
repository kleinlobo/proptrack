-- Migration: 0007_create_income_records.sql
-- Core financial table. Every rental income event. Audit triggered in 0016.

CREATE TABLE public.income_records (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID          NOT NULL REFERENCES public.properties(id),
  room_id             UUID          REFERENCES public.rooms(id),
  date                DATE          NOT NULL,
  income_source       VARCHAR(50)   NOT NULL,
  amount              DECIMAL(12,2) NOT NULL,
  currency            CHAR(3)       NOT NULL,
  amount_base         DECIMAL(12,2) NOT NULL,
  exchange_rate_used  DECIMAL(10,6) NOT NULL,
  notes               TEXT,
  status              VARCHAR(20)   NOT NULL DEFAULT 'confirmed',
  created_by          UUID          NOT NULL REFERENCES public.user_profiles(id),
  updated_by          UUID          REFERENCES public.user_profiles(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT income_source_check   CHECK (income_source IN (
    'airbnb','booking_com','direct_booking','cash','monthly_rental','other')),
  CONSTRAINT income_currency_check  CHECK (currency IN ('AED','INR')),
  CONSTRAINT income_amount_positive CHECK (amount > 0),
  CONSTRAINT income_status_check    CHECK (status IN ('confirmed')),
  CONSTRAINT income_room_property   CHECK (
    room_id IS NULL OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.property_id = income_records.property_id
    )
  )
);

CREATE INDEX idx_income_property_date ON public.income_records(property_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_income_date          ON public.income_records(date DESC)              WHERE deleted_at IS NULL;
CREATE INDEX idx_income_source        ON public.income_records(income_source)          WHERE deleted_at IS NULL;
CREATE INDEX idx_income_created_by    ON public.income_records(created_by)             WHERE deleted_at IS NULL;
CREATE INDEX idx_income_currency      ON public.income_records(currency)               WHERE deleted_at IS NULL;
