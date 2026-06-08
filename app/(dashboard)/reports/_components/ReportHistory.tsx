'use client';

import { useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useReportHistory } from '@/hooks/use-reports';
import { deleteReport, getReportSignedUrl } from '../actions';

interface Props {
  role: string;
  userId: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
  }
  if (status === 'generating') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Generating…</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>;
}

export default function ReportHistory({ role, userId }: Props) {
  const { data: reports, isLoading } = useReportHistory();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDownload(id: string, fileUrl: string, format: string) {
    if (downloadingId) return;
    setDownloadingId(id);
    startTransition(async () => {
      const url = await getReportSignedUrl(fileUrl);
      setDownloadingId(null);
      if (!url) { alert('Could not generate download link. Please try again.'); return; }
      const a = document.createElement('a');
      a.href = url;
      a.download = `proptrack-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteReport(id);
      setDeletingId(null);
      if (result?.error) {
        alert(`Delete failed: ${result.error}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
    });
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="h-4 bg-gray-100 rounded w-32 animate-pulse mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-lg mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Report History</h2>
      </div>

      {(!reports || reports.length === 0) ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          No reports generated yet. Use the builder above to create your first report.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reports.map((report) => {
            const canDelete = role === 'super_admin' || report.generated_by === userId;
            const isDownloading = downloadingId === report.id;
            const isDeleting = deletingId === report.id;

            return (
              <div key={report.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {report.report_type.replace(/_/g, ' ')} Report
                    </span>
                    <span className="text-xs text-gray-400 uppercase font-mono">{report.format}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {report.date_from} → {report.date_to}
                    </span>
                    {report.file_size_kb && (
                      <span className="text-xs text-gray-400">{report.file_size_kb} KB</span>
                    )}
                    {report.generator_name && (
                      <span className="text-xs text-gray-400">by {report.generator_name}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(report.created_at), 'dd MMM yyyy, HH:mm')}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={report.status} />

                  {report.status === 'completed' && (
                    <button
                      onClick={() => handleDownload(report.id, report.file_url, report.format)}
                      disabled={isDownloading || isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-[#276EAC] hover:bg-[#1d5a8e] text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {isDownloading ? '…' : 'Download'}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={isDeleting || isPending}
                      className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
