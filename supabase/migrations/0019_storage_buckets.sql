-- ─────────────────────────────────────────────────────────────────────────────
-- Storage Buckets (PRIVATE only — no public buckets)
-- ─────────────────────────────────────────────────────────────────────────────

-- financial-documents: expense receipts, uploaded via /api/v1/upload
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-documents',
  'financial-documents',
  false,
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- reports: generated PDF/Excel reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800,  -- 50 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies for financial-documents bucket
-- Service role bypasses RLS — receipts are uploaded/read server-side only.
-- ─────────────────────────────────────────────────────────────────────────────

-- Authenticated users can read their own receipts (path: receipts/{user_id}/*)
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'financial-documents'
  AND (storage.foldername(name))[1] = 'receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies for reports bucket
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can read their own generated reports (path: reports/{user_id}/*)
CREATE POLICY "Users can read own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Super admins can read all reports
CREATE POLICY "Super admins can read all reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);
