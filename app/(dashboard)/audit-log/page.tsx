import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export const metadata = { title: 'Audit Log — PropTrack' };

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  SOFT_DELETE: 'bg-amber-100 text-amber-700',
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const page = Math.max(1, parseInt(params.page ?? '1'));
  const perPage = 50;
  const from = (page - 1) * perPage;

  let query = supabase
    .from('audit_logs')
    .select('id, action, table_name, record_id, created_at, user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (params.table) {
    query = query.eq('table_name', params.table);
  }

  const { data: logs, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / perPage);

  const tables = ['income_records', 'expense_records', 'recurring_expenses', 'properties', 'user_profiles', 'property_assignments', 'report_history'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of all data changes.</p>
      </div>

      {/* Table filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <a
          href="/audit-log"
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${!params.table ? 'bg-[#276EAC] text-white border-[#276EAC]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          All
        </a>
        {tables.map((t) => (
          <a
            key={t}
            href={`/audit-log?table=${t}`}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${params.table === t ? 'bg-[#276EAC] text-white border-[#276EAC]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {t.replace(/_/g, ' ')}
          </a>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No audit entries found.</td>
                </tr>
              ) : (logs ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.table_name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]">{log.record_id}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.user_id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">{count} total entries</span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <a href={`/audit-log?${params.table ? `table=${params.table}&` : ''}page=${page - 1}`} className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50">
                  ← Prev
                </a>
              )}
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <a href={`/audit-log?${params.table ? `table=${params.table}&` : ''}page=${page + 1}`} className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50">
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
