-- Migration: 0009_create_recurring_expenses.sql
-- Template records read by the daily cron Edge Function to generate expense_records.

CREATE TABLE public.recurring_expenses (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID          NOT NULL REFERENCES public.properties(id),
  room_id         UUID          REFERENCES public.rooms(id),
  category_id     UUID          NOT NULL REFERENCES public.expense_categories(id),
  vendor          VARCHAR(255),
  amount          DECIMAL(12,2) NOT NULL,
  currency        CHAR(3)       NOT NULL,
  payment_method  VARCHAR(50)   NOT NULL,
  recurrence_type VARCHAR(20)   NOT NULL,
  day_of_month    SMALLINT,
  start_date      DATE          NOT NULL,
  end_date        DATE,
  next_due_date   DATE          NOT NULL,
  notes           TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by      UUID          NOT NULL REFERENCES public.user_profiles(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT recurring_currency_check  CHECK (currency IN ('AED','INR')),
  CONSTRAINT recurring_amount_positive CHECK (amount > 0),
  CONSTRAINT recurring_payment_check   CHECK (payment_method IN (
    'bank_transfer','cash','credit_card','cheque','online_payment','other')),
  CONSTRAINT recurring_type_check      CHECK (recurrence_type IN (
    'weekly','monthly','quarterly','annually')),
  CONSTRAINT recurring_day_range       CHECK (day_of_month BETWEEN 1 AND 28),
  CONSTRAINT recurring_dates_check     CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX idx_recurring_property ON public.recurring_expenses(property_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_next_due ON public.recurring_expenses(next_due_date) WHERE deleted_at IS NULL AND is_active = TRUE;

-- Now that recurring_expenses exists, add the deferred FK from expense_records
ALTER TABLE public.expense_records
  ADD CONSTRAINT fk_expense_records_recurring
  FOREIGN KEY (recurring_id) REFERENCES public.recurring_expenses(id);
