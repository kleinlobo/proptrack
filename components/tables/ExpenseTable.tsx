'use client';

import { format } from 'date-fns';
import { Pencil, Trash2, CheckCircle2, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency/format';
import { createClient } from '@/lib/supabase/client';
import type { ExpenseRow } from '@/hooks/use-expenses';

interface Props {
  rows: ExpenseRow[];
  total: number;
  page: number;
  pageSize: number;
  sortCol: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  onPageChange: (p: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
  role: 'super_admin' | 'property_manager' | 'read_only';
  loading: boolean;
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronUp className="w-3.5 h-3.5 opacity-30" aria-hidden="true" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
    : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />;
}

async function openReceipt(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from('financial-documents')
    .createSignedUrl(path, 120);
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export function ExpenseTable({
  rows, total, page, pageSize, sortCol, sortDir,
  onSort, onPageChange, onEdit, onDelete, onConfirm, role, loading,
}: Props) {
  const canEdit = role !== 'read_only';
  const canDelete = role === 'super_admin';
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  if (loading) {
    return (
      <div className="space-y-1" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-neutral-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const sortableCols = ['date', 'amount', 'amount_base'];

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              {[
                { key: 'date', label: 'Date' },
                { key: 'property', label: 'Property' },
                { key: 'category', label: 'Category' },
                { key: 'vendor', label: 'Vendor' },
                { key: 'amount', label: 'Amount', right: true },
                { key: 'amount_base', label: 'Base Amount', right: true },
                { key: 'status', label: 'Status' },
                ...(canEdit || canDelete ? [{ key: 'actions', label: '' }] : []),
              ].map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider',
                    col.right ? 'text-right' : 'text-left',
                    sortableCols.includes(col.key) ? 'cursor-pointer select-none' : ''
                  )}
                  onClick={() => sortableCols.includes(col.key) && onSort(col.key)}
                >
                  <span className="flex items-center gap-1" style={col.right ? { justifyContent: 'flex-end' } : {}}>
                    {col.label}
                    {sortableCols.includes(col.key) && (
                      <SortIcon active={sortCol === col.key} dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors',
                  i % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-[#F7FAFD] dark:bg-[#1E2D3D]'
                )}
              >
                <td className="px-4 py-3 text-[var(--color-neutral-700)] whitespace-nowrap">
                  {format(new Date(row.date), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3 text-[var(--color-neutral-700)]">
                  <span className="block">{row.property_name}</span>
                  {row.room_name && (
                    <span className="text-xs text-[var(--color-neutral-500)]">{row.room_name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-neutral-700)]">
                  {row.category_name}
                </td>
                <td className="px-4 py-3 text-[var(--color-neutral-500)]">
                  <div className="flex items-center gap-1.5">
                    {row.vendor ?? '—'}
                    {row.attachment_url && (
                      <button
                        onClick={() => openReceipt(row.attachment_url!)}
                        className="text-[#276EAC] hover:text-[#1E5C91] transition-colors"
                        title="View receipt"
                        aria-label="View receipt"
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--color-neutral-900)]">
                  {formatCurrency(row.amount, row.currency as 'AED' | 'INR')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--color-neutral-500)]">
                  {formatCurrency(row.amount_base, row.base_currency as 'AED' | 'INR')}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    row.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  )}>
                    {row.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </span>
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && row.status === 'pending_confirmation' && (
                        <button
                          onClick={() => onConfirm(row.id)}
                          aria-label="Confirm expense"
                          title="Confirm expense"
                          className="p-1.5 rounded hover:bg-emerald-50 text-[var(--color-neutral-500)] hover:text-emerald-600 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => onEdit(row.id)}
                          aria-label="Edit expense"
                          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          aria-label="Delete expense"
                          className="p-1.5 rounded hover:bg-red-50 text-[var(--color-neutral-500)] hover:text-[var(--color-error)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-neutral-100 text-sm text-[var(--color-neutral-500)]">
          <span>{start}–{end} of {total} records</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Previous
            </button>
            <span className="px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
