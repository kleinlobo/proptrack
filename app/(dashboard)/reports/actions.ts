'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchReportData } from '@/lib/reports/fetch-data';
import { generatePdf } from '@/lib/reports/generate-pdf';
import { generateExcel } from '@/lib/reports/generate-excel';
import type { ReportType, ReportFormat } from '@/lib/reports/types';

export type GenerateReportState = {
  error?: string;
  reportId?: string;
  success?: boolean;
};

export async function generateReport(
  _prev: GenerateReportState,
  formData: FormData
): Promise<GenerateReportState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string;
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to generate reports.' };
  }

  const report_type = formData.get('report_type') as ReportType;
  const format = formData.get('format') as ReportFormat;
  const date_from = formData.get('date_from') as string;
  const date_to = formData.get('date_to') as string;
  const property_ids_raw = formData.getAll('property_ids') as string[];
  const property_ids = property_ids_raw.length > 0 ? property_ids_raw : null;

  if (!report_type || !format || !date_from || !date_to) {
    return { error: 'Please fill in all required fields.' };
  }

  // Scope check for non-SA
  let scopedIds = property_ids;
  if (role !== 'super_admin') {
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    const allowed = (assignments ?? []).map((a) => a.property_id);
    scopedIds = property_ids
      ? property_ids.filter((id) => allowed.includes(id))
      : allowed;
    if (scopedIds.length === 0) return { error: 'No accessible properties.' };
  }

  // Create placeholder record
  const { data: historyRow, error: insertErr } = await supabase
    .from('report_history')
    .insert({
      report_type,
      format,
      date_from,
      date_to,
      property_ids: scopedIds,
      status: 'generating',
      generated_by: user.id,
      file_url: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !historyRow) {
    console.error('report_history insert:', insertErr?.message);
    return { error: 'Failed to create report record.' };
  }

  const reportId = historyRow.id;

  try {
    const data = await fetchReportData(supabase, {
      report_type,
      format,
      date_from,
      date_to,
      property_ids: scopedIds,
    });

    const buffer = format === 'pdf' ? await generatePdf(data) : await generateExcel(data);

    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const storagePath = `reports/${user.id}/${reportId}.${ext}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadErr } = await serviceClient.storage
      .from('reports')
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (uploadErr) throw new Error(uploadErr.message);

    await supabase
      .from('report_history')
      .update({ status: 'completed', file_url: storagePath, file_size_kb: Math.round(buffer.length / 1024) })
      .eq('id', reportId);

    revalidatePath('/reports');
    return { success: true, reportId };
  } catch (err) {
    console.error('generateReport error:', err);
    await supabase
      .from('report_history')
      .update({ status: 'failed' })
      .eq('id', reportId);
    return { error: 'Report generation failed. Please try again.' };
  }
}

export async function deleteReport(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string;

  // Use service client to bypass RLS for the permission check + soft-delete
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: report } = await serviceClient
    .from('report_history')
    .select('generated_by, file_url, deleted_at')
    .eq('id', id)
    .single();

  if (!report) return { error: 'Report not found.' };
  if (report.deleted_at) return { error: 'Report already deleted.' };

  if (role !== 'super_admin' && report.generated_by !== user.id) {
    return { error: 'You can only delete your own reports.' };
  }

  const { error: updateErr } = await serviceClient
    .from('report_history')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id);

  if (updateErr) return { error: 'Failed to delete report.' };

  revalidatePath('/reports');
  return {};
}

export async function getReportSignedUrl(fileUrl: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.storage
    .from('reports')
    .createSignedUrl(fileUrl, 300);

  return data?.signedUrl ?? null;
}
