'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface ReportHistoryRow {
  id: string;
  report_type: string;
  format: string;
  date_from: string;
  date_to: string;
  status: 'generating' | 'completed' | 'failed';
  file_url: string;
  file_size_kb: number | null;
  generated_by: string;
  property_ids: string[] | null;
  created_at: string;
  generator_name: string | null;
}

export function useReportHistory() {
  const supabase = createClient();

  return useQuery<ReportHistoryRow[]>({
    queryKey: ['report-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_history')
        .select('*, user_profiles!report_history_generated_by_fkey(full_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.id,
        report_type: r.report_type,
        format: r.format,
        date_from: r.date_from,
        date_to: r.date_to,
        status: r.status as ReportHistoryRow['status'],
        file_url: r.file_url,
        file_size_kb: r.file_size_kb,
        generated_by: r.generated_by,
        property_ids: r.property_ids,
        created_at: r.created_at,
        generator_name: (r.user_profiles as { full_name: string } | null)?.full_name ?? null,
      }));
    },
    staleTime: 30_000,
  });
}
