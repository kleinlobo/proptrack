-- Migration: 0018_seed_data.sql
-- Seed essential reference data. All INSERT statements are idempotent via ON CONFLICT DO NOTHING.

-- Countries
INSERT INTO public.countries (name, code, base_currency)
VALUES
  ('UAE',   'AE', 'AED'),
  ('India', 'IN', 'INR')
ON CONFLICT (code) DO NOTHING;

-- Default financial year (January 1)
INSERT INTO public.financial_year_settings (start_month, start_day, label)
VALUES (1, 1, 'Default')
ON CONFLICT (is_active) DO NOTHING;

-- Parent expense categories
INSERT INTO public.expense_categories (name, slug, sort_order)
VALUES
  ('Utilities',      'utilities',      1),
  ('Operations',     'operations',     2),
  ('Staff',          'staff',          3),
  ('Marketing',      'marketing',      4),
  ('Property Costs', 'property-costs', 5),
  ('Other',          'other',          6)
ON CONFLICT (slug) DO NOTHING;

-- Child expense categories (looked up by parent slug)
INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Electricity', 'utilities-electricity', 1 FROM public.expense_categories WHERE slug = 'utilities'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Water', 'utilities-water', 2 FROM public.expense_categories WHERE slug = 'utilities'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Internet', 'utilities-internet', 3 FROM public.expense_categories WHERE slug = 'utilities'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Cleaning', 'operations-cleaning', 1 FROM public.expense_categories WHERE slug = 'operations'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Laundry', 'operations-laundry', 2 FROM public.expense_categories WHERE slug = 'operations'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Consumables', 'operations-consumables', 3 FROM public.expense_categories WHERE slug = 'operations'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Maintenance', 'operations-maintenance', 4 FROM public.expense_categories WHERE slug = 'operations'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Salaries', 'staff-salaries', 1 FROM public.expense_categories WHERE slug = 'staff'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Commissions', 'staff-commissions', 2 FROM public.expense_categories WHERE slug = 'staff'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Mgmt Fees', 'staff-management-fees', 3 FROM public.expense_categories WHERE slug = 'staff'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Advertising', 'marketing-advertising', 1 FROM public.expense_categories WHERE slug = 'marketing'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Photography', 'marketing-photography', 2 FROM public.expense_categories WHERE slug = 'marketing'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Rent', 'property-costs-rent', 1 FROM public.expense_categories WHERE slug = 'property-costs'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Mortgage', 'property-costs-mortgage', 2 FROM public.expense_categories WHERE slug = 'property-costs'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.expense_categories (parent_id, name, slug, sort_order)
SELECT id, 'Insurance', 'property-costs-insurance', 3 FROM public.expense_categories WHERE slug = 'property-costs'
ON CONFLICT (slug) DO NOTHING;
