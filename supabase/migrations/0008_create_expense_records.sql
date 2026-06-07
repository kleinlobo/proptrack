-- Migration: 0008_create_expense_records.sql
-- Core financial table. Every property expense — manual and recurring. Audit triggered in 0016.
-- Note: recurring_id FK to recurring_expenses added in 0016 (circular dependency — 0009 created after this)

CREATE TABLE public.expense_records (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID          NOT NULL REFERENCES public.properties(id),
  room_id             UUID          REFERENCES public.rooms(id),
  date                DATE          NOT NULL,
  category_id         UUID          NOT NULL REFERENCES public.expense_categories(id),
  vendor              VARCHAR(255),
  amount              DECIMAL(12,2) NOT NULL,
  currency            CHAR(3)       NOT NULL,
  amount_base         DECIMAL(12,2) NOT NULL,
  exchange_rate_used  DECIMAL(10,6) NOT NULL,
  payment_method      VARCHAR(50)   NOT NULL,
  notes               TEXT,
  attachment_url      VARCHAR(1024),
  attachment_name     VARCHAR(255),
  attachment_size_kb  INTEGER,
  is_recurring        BOOLEAN       NOT NULL DEFAULT FALSE,
  recurring_id        UUID,
  status              VARCHAR(30)   NOT NULL DEFAULT 'confirmed',
  created_by          UUID          NOT NULL REFERENCES public.user_profiles(id),
  updated_by          UUID          REFERENCES public.user_profiles(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT expense_currency_check   CHECK (currency IN ('AED','INR')),
  CONSTRAINT expense_amount_positive  CHECK (amount > 0),
  CONSTRAINT expense_payment_check    CHECK (payment_method IN (
    'bank_transfer','cash','credit_card','cheque','online_payment','other')),
  CONSTRAINT expense_status_check     CHECK (status IN ('pending_confirmation','confirmed')),
  CONSTRAINT expense_room_property    CHECK (
    room_id IS NULL OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.property_id = expense_records.property_id
    )
  ),
  CONSTRAINT expense_recurring_flag   CHECK (
    (is_recurring = TRUE AND recurring_id IS NOT NULL) OR
    (is_recurring = FALSE)
  )
);

CREATE INDEX idx_expense_property_date ON public.expense_records(property_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_date          ON public.expense_records(date DESC)              WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_category      ON public.expense_records(category_id)            WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_status        ON public.expense_records(status)                 WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_recurring     ON public.expense_records(recurring_id)           WHERE deleted_at IS NULL;
CREATE INDEX idx_expense_created_by    ON public.expense_records(created_by)             WHERE deleted_at IS NULL;
