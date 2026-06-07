-- Migration: 0006_create_expense_categories.sql
-- Self-referential two-level category tree. parent_id = NULL = top-level.

CREATE TABLE public.expense_categories (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID          REFERENCES public.expense_categories(id),
  name       VARCHAR(100)  NOT NULL,
  slug       VARCHAR(100)  NOT NULL,
  is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order INTEGER       NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID          REFERENCES public.user_profiles(id),
  CONSTRAINT expense_categories_slug_unique UNIQUE (slug),
  CONSTRAINT expense_categories_max_depth CHECK (
    parent_id IS NULL OR
    (SELECT parent_id FROM public.expense_categories ec2
     WHERE ec2.id = expense_categories.parent_id) IS NULL
  )
);

CREATE INDEX idx_categories_parent ON public.expense_categories(parent_id);
