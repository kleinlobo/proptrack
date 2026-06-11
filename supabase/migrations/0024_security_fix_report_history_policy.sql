-- Migration: 0024_security_fix_report_history_policy.sql
-- F5: Remove client-side UPDATE policy on report_history.
-- All updates are performed server-side via the admin client in generate-report route,
-- so no authenticated client policy is needed.

DROP POLICY IF EXISTS report_history_update ON public.report_history;
