-- Migration: 0011_create_notifications.sql

CREATE TABLE public.notifications (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type                VARCHAR(50)   NOT NULL,
  title               VARCHAR(255)  NOT NULL,
  body                TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id   UUID,
  is_read             BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  read_at             TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT notification_type_check CHECK (type IN (
    'recurring_due','missing_income','large_expense','report_ready','recurring_overdue'))
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC)
  WHERE deleted_at IS NULL;

-- Realtime: enable via Supabase dashboard or run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
