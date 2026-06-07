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
  CONSTRAINT expense_categories_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_categories_parent ON public.expense_categories(parent_id);

-- Enforce max 2 levels (top-level and one child level) via trigger
-- because PostgreSQL does not allow subqueries in CHECK constraints
CREATE OR REPLACE FUNCTION public.check_category_max_depth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF (SELECT parent_id FROM public.expense_categories WHERE id = NEW.parent_id) IS NOT NULL THEN
      RAISE EXCEPTION 'expense_categories only supports two levels (parent must be a top-level category)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_categories_max_depth
  BEFORE INSERT OR UPDATE OF parent_id ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.check_category_max_depth();
