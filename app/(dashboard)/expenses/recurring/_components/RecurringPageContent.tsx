'use client';

import { useState, useCallback, useTransition } from 'react';
import { format } from 'date-fns';
import { PlusCircle, Pencil, Trash2, Pause, Play, CalendarClock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency/format';
import { RecurringModal } from '@/components/forms/RecurringModal';
import { useRecurringList } from '@/hooks/use-recurring';
import { toggleRecurringExpense, deleteRecurringExpense } from '@/app/(dashboard)/expenses/recurring/actions';

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

interface Props {
  role: 'super_admin' | 'property_manager' | 'read_only';
  scopedPropertyIds: string[] | null;
}

export function RecurringPageContent({ role, scopedPropertyIds }: Props) {
  const canEdit = role !== 'read_only';
  const canDelete = role === 'super_admin';
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useRecurringList(scopedPropertyIds);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['recurring-list'] });
  }, [queryClient]);

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleRecurringExpense(id, isActive);
      invalidate();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this recurring expense? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteRecurringExpense(id);
      invalidate();
    });
  }

  const active = rows.filter((r) => r.is_active);
  const paused = rows.filter((r) => !r.is_active);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Recurring Expenses</h1>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              {active.length} active · {paused.length} paused
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#276EAC] hover:bg-[#1E5C91] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              New Recurring
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {isLoading ? (
            <div className="space-y-1 p-4" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <CalendarClock className="w-10 h-10 text-[var(--color-neutral-300)]" aria-hidden="true" />
              <p className="text-sm font-medium text-[var(--color-neutral-600)]">No recurring expenses set up yet</p>
              {canEdit && (
                <button onClick={() => setAddOpen(true)} className="text-sm text-[#276EAC] hover:underline">
                  Create your first recurring expense
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    {['Property', 'Category', 'Vendor', 'Amount', 'Frequency', 'Next Due', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((row, i) => {
                    const isDue = new Date(row.next_due_date) <= new Date();
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/30',
                          i % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-[#F7FAFD] dark:bg-[#1E2D3D]',
                          !row.is_active && 'opacity-60'
                        )}
                      >
                        <td className="px-4 py-3 text-[var(--color-neutral-700)]">
                          <span className="block">{row.property_name}</span>
                          {row.room_name && <span className="text-xs text-[var(--color-neutral-500)]">{row.room_name}</span>}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-neutral-700)]">{row.category_name}</td>
                        <td className="px-4 py-3 text-[var(--color-neutral-500)]">{row.vendor ?? '—'}</td>
                        <td className="px-4 py-3 font-medium tabular-nums text-[var(--color-neutral-900)]">
                          {formatCurrency(row.amount, row.currency as 'AED' | 'INR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-[var(--color-neutral-700)]">
                            {RECURRENCE_LABELS[row.recurrence_type] ?? row.recurrence_type}
                            {row.day_of_month && row.recurrence_type !== 'weekly' && ` · day ${row.day_of_month}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('text-sm', isDue && row.is_active ? 'text-amber-600 font-semibold' : 'text-[var(--color-neutral-600)]')}>
                            {format(new Date(row.next_due_date), 'dd MMM yyyy')}
                            {isDue && row.is_active && ' (due)'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-[var(--color-neutral-500)]'
                          )}>
                            {row.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(canEdit || canDelete) && (
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && (
                                <button
                                  onClick={() => handleToggle(row.id, row.is_active)}
                                  aria-label={row.is_active ? 'Pause' : 'Resume'}
                                  title={row.is_active ? 'Pause' : 'Resume'}
                                  className="p-1.5 rounded hover:bg-neutral-100 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
                                >
                                  {row.is_active
                                    ? <Pause className="w-4 h-4" aria-hidden="true" />
                                    : <Play className="w-4 h-4" aria-hidden="true" />}
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => setEditId(row.id)}
                                  aria-label="Edit"
                                  className="p-1.5 rounded hover:bg-neutral-100 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors"
                                >
                                  <Pencil className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  aria-label="Delete"
                                  className="p-1.5 rounded hover:bg-red-50 text-[var(--color-neutral-500)] hover:text-[var(--color-error)] transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* End-date summary */}
        {rows.some((r) => r.end_date) && (
          <p className="text-xs text-[var(--color-neutral-400)]">
            * Some schedules have an end date — they will stop generating expenses automatically.
          </p>
        )}
      </div>

      <RecurringModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />
      <RecurringModal
        open={!!editId}
        editId={editId}
        onClose={() => setEditId(null)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />
    </>
  );
}
