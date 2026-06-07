-- Migration: 0017_enable_rls_policies.sql
-- Enable RLS on all 14 tables, then create all policies.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.countries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_year_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_history         ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Config tables: countries, expense_categories, exchange_rates, financial_year_settings
-- All authenticated users can read. Only super_admin can write.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY countries_select_all ON public.countries
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY countries_write_super_admin ON public.countries
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY categories_select_all ON public.expense_categories
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY categories_write_super_admin ON public.expense_categories
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY exchange_rates_select_all ON public.exchange_rates
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY exchange_rates_write_super_admin ON public.exchange_rates
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY fy_select_all ON public.financial_year_settings
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY fy_write_super_admin ON public.financial_year_settings
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- Properties and rooms: super_admin full access; PM sees assigned properties
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY properties_select_super_admin ON public.properties
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'super_admin');

CREATE POLICY properties_select_manager ON public.properties
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'property_manager' AND
    id = ANY(public.get_my_property_ids())
  );

CREATE POLICY properties_select_read_only ON public.properties
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'read_only');

CREATE POLICY properties_write_super_admin ON public.properties
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY rooms_select_super_admin ON public.rooms
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'super_admin');

CREATE POLICY rooms_select_manager ON public.rooms
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY rooms_select_read_only ON public.rooms
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'read_only');

CREATE POLICY rooms_write_super_admin ON public.rooms
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- User management
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'super_admin');

CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE TO authenticated
  USING  (id = auth.uid() OR public.get_my_role() = 'super_admin')
  WITH CHECK (id = auth.uid() OR public.get_my_role() = 'super_admin');

CREATE POLICY user_profiles_insert_super_admin ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY pa_select_own ON public.property_assignments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_my_role() = 'super_admin'
  );

CREATE POLICY pa_write_super_admin ON public.property_assignments
  FOR ALL TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- income_records: per-role SELECT + scoped INSERT/UPDATE + hard-delete blocked
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY income_select_super_admin ON public.income_records
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'super_admin');

CREATE POLICY income_select_manager ON public.income_records
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY income_select_read_only ON public.income_records
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'read_only');

CREATE POLICY income_insert_super_admin ON public.income_records
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY income_insert_manager ON public.income_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY income_update_super_admin ON public.income_records
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY income_update_manager ON public.income_records
  FOR UPDATE TO authenticated
  USING  (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY income_hard_delete_blocked ON public.income_records
  FOR DELETE TO authenticated
  USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- expense_records: same pattern as income_records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY expense_select_super_admin ON public.expense_records
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'super_admin');

CREATE POLICY expense_select_manager ON public.expense_records
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY expense_select_read_only ON public.expense_records
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'read_only');

CREATE POLICY expense_insert_super_admin ON public.expense_records
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY expense_insert_manager ON public.expense_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY expense_update_super_admin ON public.expense_records
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY expense_update_manager ON public.expense_records
  FOR UPDATE TO authenticated
  USING  (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY expense_hard_delete_blocked ON public.expense_records
  FOR DELETE TO authenticated
  USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- recurring_expenses: same pattern as income_records / expense_records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY recurring_select_super_admin ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'super_admin');

CREATE POLICY recurring_select_manager ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY recurring_select_read_only ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.get_my_role() = 'read_only');

CREATE POLICY recurring_insert_super_admin ON public.recurring_expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY recurring_insert_manager ON public.recurring_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY recurring_update_super_admin ON public.recurring_expenses
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY recurring_update_manager ON public.recurring_expenses
  FOR UPDATE TO authenticated
  USING  (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'property_manager' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY recurring_hard_delete_blocked ON public.recurring_expenses
  FOR DELETE TO authenticated
  USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications: users see only their own; service_role inserts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_insert_service ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit logs: super_admin reads only; no client writes (triggers only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- Report history: users see their own; super_admin sees all
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY report_history_select ON public.report_history
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      generated_by = auth.uid() OR
      public.get_my_role() = 'super_admin'
    )
  );

CREATE POLICY report_history_insert ON public.report_history
  FOR INSERT TO authenticated
  WITH CHECK (generated_by = auth.uid());
