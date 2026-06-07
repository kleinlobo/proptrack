-- Migration: 0014_create_report_history.sql

CREATE TABLE public.report_history (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by  UUID          NOT NULL REFERENCES public.user_profiles(id),
  report_type   VARCHAR(30)   NOT NULL,
  format        VARCHAR(10)   NOT NULL,
  date_from     DATE          NOT NULL,
  date_to       DATE          NOT NULL,
  property_ids  UUID[],
  country_ids   UUID[],
  manager_ids   UUID[],
  file_url      VARCHAR(1024) NOT NULL,
  file_size_kb  INTEGER,
  status        VARCHAR(20)   NOT NULL DEFAULT 'completed',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT report_type_check   CHECK (report_type IN (
    'monthly','annual','property','country','manager')),
  CONSTRAINT report_format_check CHECK (format IN ('pdf','excel')),
  CONSTRAINT report_status_check CHECK (status IN ('generating','completed','failed'))
);

CREATE INDEX idx_report_history_user ON public.report_history(generated_by, created_at DESC)
  WHERE deleted_at IS NULL;
