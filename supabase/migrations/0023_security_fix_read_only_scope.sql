-- Migration: 0023_security_fix_read_only_scope.sql
-- F3: Scope read_only RLS policies to assigned properties only.
-- Previously read_only users could see ALL properties and financial data cross-tenant.

DROP POLICY IF EXISTS properties_select_read_only ON public.properties;
DROP POLICY IF EXISTS rooms_select_read_only ON public.rooms;
DROP POLICY IF EXISTS income_select_read_only ON public.income_records;
DROP POLICY IF EXISTS expense_select_read_only ON public.expense_records;
DROP POLICY IF EXISTS recurring_select_read_only ON public.recurring_expenses;

CREATE POLICY properties_select_read_only ON public.properties
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'read_only' AND
    id = ANY(public.get_my_property_ids())
  );

CREATE POLICY rooms_select_read_only ON public.rooms
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'read_only' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY income_select_read_only ON public.income_records
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'read_only' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY expense_select_read_only ON public.expense_records
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'read_only' AND
    property_id = ANY(public.get_my_property_ids())
  );

CREATE POLICY recurring_select_read_only ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    public.get_my_role() = 'read_only' AND
    property_id = ANY(public.get_my_property_ids())
  );
