-- Migration: 0015_create_views.sql
-- Four dashboard/reporting views. All respect soft-delete via WHERE deleted_at IS NULL.
-- RLS on underlying tables still applies when views are queried by authenticated users.

CREATE OR REPLACE VIEW public.revenue_summary_v AS
SELECT
  ir.property_id,
  p.name                          AS property_name,
  p.country_id,
  c.name                          AS country_name,
  p.base_currency,
  DATE_TRUNC('month', ir.date)    AS month,
  ir.income_source,
  ir.currency                     AS original_currency,
  SUM(ir.amount)                  AS total_amount,
  SUM(ir.amount_base)             AS total_amount_base,
  COUNT(*)                        AS record_count
FROM public.income_records ir
JOIN public.properties p ON p.id = ir.property_id
JOIN public.countries  c ON c.id = p.country_id
WHERE ir.deleted_at IS NULL
  AND ir.status = 'confirmed'
GROUP BY
  ir.property_id, p.name, p.country_id, c.name, p.base_currency,
  DATE_TRUNC('month', ir.date), ir.income_source, ir.currency;

CREATE OR REPLACE VIEW public.expense_summary_v AS
SELECT
  er.property_id,
  p.name                          AS property_name,
  p.country_id,
  c.name                          AS country_name,
  p.base_currency,
  DATE_TRUNC('month', er.date)    AS month,
  er.category_id,
  ec_parent.name                  AS category_parent,
  ec.name                         AS category_name,
  er.currency                     AS original_currency,
  SUM(er.amount)                  AS total_amount,
  SUM(er.amount_base)             AS total_amount_base,
  COUNT(*)                        AS record_count
FROM public.expense_records er
JOIN public.properties         p         ON p.id  = er.property_id
JOIN public.countries          c         ON c.id  = p.country_id
JOIN public.expense_categories ec        ON ec.id = er.category_id
LEFT JOIN public.expense_categories ec_parent ON ec_parent.id = ec.parent_id
WHERE er.deleted_at IS NULL
  AND er.status = 'confirmed'
GROUP BY
  er.property_id, p.name, p.country_id, c.name, p.base_currency,
  DATE_TRUNC('month', er.date), er.category_id,
  ec_parent.name, ec.name, er.currency;

CREATE OR REPLACE VIEW public.property_performance_v AS
SELECT
  p.id                            AS property_id,
  p.name                          AS property_name,
  p.country_id,
  c.name                          AS country_name,
  p.base_currency,
  COALESCE(rev.total_revenue, 0)  AS total_revenue_base,
  COALESCE(exp.total_expenses, 0) AS total_expenses_base,
  COALESCE(rev.total_revenue, 0)
    - COALESCE(exp.total_expenses, 0) AS net_profit_base,
  CASE
    WHEN COALESCE(rev.total_revenue, 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(rev.total_revenue, 0) - COALESCE(exp.total_expenses, 0))
      / COALESCE(rev.total_revenue, 0) * 100, 2)
  END                             AS profit_margin_pct
FROM public.properties p
JOIN public.countries c ON c.id = p.country_id
LEFT JOIN (
  SELECT property_id, SUM(amount_base) AS total_revenue
  FROM public.income_records
  WHERE deleted_at IS NULL AND status = 'confirmed'
  GROUP BY property_id
) rev ON rev.property_id = p.id
LEFT JOIN (
  SELECT property_id, SUM(amount_base) AS total_expenses
  FROM public.expense_records
  WHERE deleted_at IS NULL AND status = 'confirmed'
  GROUP BY property_id
) exp ON exp.property_id = p.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.pending_confirmations_v AS
SELECT
  er.id,
  er.property_id,
  p.name                          AS property_name,
  er.room_id,
  r.name                          AS room_name,
  er.category_id,
  ec.name                         AS category_name,
  ec_parent.name                  AS category_parent,
  er.vendor,
  er.amount,
  er.currency,
  er.amount_base,
  er.date,
  er.recurring_id,
  er.created_at,
  CURRENT_DATE - er.date          AS days_pending
FROM public.expense_records er
JOIN public.properties         p         ON p.id  = er.property_id
JOIN public.expense_categories ec        ON ec.id = er.category_id
LEFT JOIN public.rooms         r         ON r.id  = er.room_id
LEFT JOIN public.expense_categories ec_parent ON ec_parent.id = ec.parent_id
WHERE er.status = 'pending_confirmation'
  AND er.deleted_at IS NULL;
