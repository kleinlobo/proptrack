-- Allow users to update their own report_history rows (status, file_url, file_size_kb, deleted_at, deleted_by)
-- Service role bypasses this, but user client needs it for the generate-report API route
CREATE POLICY report_history_update ON public.report_history
  FOR UPDATE TO authenticated
  USING (generated_by = auth.uid())
  WITH CHECK (generated_by = auth.uid());
