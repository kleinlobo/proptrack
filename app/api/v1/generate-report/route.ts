import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { fetchReportData } from '@/lib/reports/fetch-data';
import { generatePdf } from '@/lib/reports/generate-pdf';
import { generateExcel } from '@/lib/reports/generate-excel';
import type { ReportType, ReportFormat } from '@/lib/reports/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string;
  if (!['super_admin', 'property_manager'].includes(role)) {
    return NextResponse.json({ error: 'You do not have permission to generate reports.' }, { status: 403 });
  }

  let body: {
    report_type: ReportType;
    format: ReportFormat;
    date_from: string;
    date_to: string;
    property_ids?: string[];
    stream?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { report_type, format, date_from, date_to, property_ids, stream } = body;

  if (!report_type || !format || !date_from || !date_to) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  // Scope check for non-SA
  let scopedIds = property_ids && property_ids.length > 0 ? property_ids : null;
  if (role !== 'super_admin') {
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    const allowed = (assignments ?? []).map((a) => a.property_id);
    scopedIds = scopedIds
      ? scopedIds.filter((id) => allowed.includes(id))
      : allowed;
    if (!scopedIds || scopedIds.length === 0) {
      return NextResponse.json({ error: 'No accessible properties.' }, { status: 403 });
    }
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
    return NextResponse.json({ error: 'Failed to create report record.' }, { status: 500 });
  }

  const reportId = historyRow.id;

  // Service client used for all writes after auth — bypasses RLS for status updates
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const data = await fetchReportData(supabase, {
      report_type,
      format,
      date_from,
      date_to,
      property_ids: scopedIds,
    });

    const buffer = format === 'pdf' ? await generatePdf(data) : await generateExcel(data);

    // Mobile requests stream=true — return bytes directly, skip storage
    if (stream) {
      const contentType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      await serviceClient.from('report_history').update({ status: 'completed', file_size_kb: Math.round(buffer.length / 1024) }).eq('id', reportId);
      return new Response(buffer, { status: 200, headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="report.${format === 'pdf' ? 'pdf' : 'xlsx'}"` } });
    }

    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const storagePath = `reports/${user.id}/${reportId}.${ext}`;
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const { error: uploadErr } = await serviceClient.storage
      .from('reports')
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (uploadErr) throw new Error(uploadErr.message);

    const { error: updateErr } = await serviceClient
      .from('report_history')
      .update({
        status: 'completed',
        file_url: storagePath,
        file_size_kb: Math.round(buffer.length / 1024),
      })
      .eq('id', reportId);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ success: true, reportId });
  } catch (err) {
    console.error('generateReport error:', err);
    await serviceClient
      .from('report_history')
      .update({ status: 'failed' })
      .eq('id', reportId);
    return NextResponse.json({ error: 'Report generation failed. Please try again.' }, { status: 500 });
  }
}
