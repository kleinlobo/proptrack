'use client';

import { useState, useCallback, useTransition } from 'react';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { ExpenseTable } from '@/components/tables/ExpenseTable';
import { FilterPanel, type FilterState } from '@/components/tables/FilterPanel';
import { ExpenseModal } from '@/components/forms/ExpenseModal';
import { DeleteExpenseModal } from '@/components/forms/DeleteExpenseModal';
import { useExpenseList, usePendingExpenses } from '@/hooks/use-expenses';
import { useScopedProperties } from '@/hooks/use-income';
import { formatCurrency } from '@/lib/currency/format';
import { confirmExpenseRecord } from '@/app/(dashboard)/expenses/actions';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  property_ids: [],
  sources: [],
  currencies: [],
  date_from: '',
  date_to: '',
};

interface Props {
  role: 'super_admin' | 'property_manager' | 'read_only';
  scopedPropertyIds: string[] | null;
}

type Tab = 'all' | 'pending';

export function ExpensePageContent({ role, scopedPropertyIds }: Props) {
  const canEdit = role !== 'read_only';
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const expenseFilters = {
    ...filters,
    status: activeTab === 'pending' ? ('pending_confirmation' as const) : ('all' as const),
    sources: undefined,
  };

  const { data, isLoading } = useExpenseList(expenseFilters, page, sortCol, sortDir, scopedPropertyIds);
  const { data: pendingRows = [], isLoading: pendingLoading } = usePendingExpenses(scopedPropertyIds);
  const { data: properties = [] } = useScopedProperties(scopedPropertyIds);


  function handleSort(col: string) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
    setPage(0);
  }

  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    setPage(0);
  }

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expense-list'] });
    queryClient.invalidateQueries({ queryKey: ['pending-expenses'] });
  }, [queryClient]);

  function handleConfirm(id: string) {
    startTransition(async () => {
      await confirmExpenseRecord(id);
      invalidate();
    });
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;

  // Build category filter pills from useExpenseCategories for FilterPanel
  // FilterPanel uses "sources" slot but we'll repurpose property/category logic
  // For expenses, property filter still works; we skip the sources pill group.

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Expenses</h1>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              {total > 0 ? `${total} record${total !== 1 ? 's' : ''}` : 'No records'}
              {pendingRows.length > 0 && ` · ${pendingRows.length} pending confirmation`}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#276EAC] hover:bg-[#1E5C91] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              Add Expense
            </button>
          )}
        </div>

        {/* Pending banner */}
        {pendingRows.length > 0 && activeTab !== 'pending' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
            <p className="text-sm font-medium">
              {pendingRows.length} expense{pendingRows.length !== 1 ? 's' : ''} pending confirmation.{' '}
              <button className="underline hover:no-underline" onClick={() => setActiveTab('pending')}>
                View now
              </button>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          {([['all', 'All Expenses'], ['pending', `Pending (${pendingRows.length})`]] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(0); }}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab
                  ? 'border-[#276EAC] text-[#276EAC]'
                  : 'border-transparent text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters — only on All tab */}
        {activeTab === 'all' && (
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            properties={properties}
          />
        )}

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {activeTab === 'pending' ? (
            pendingLoading ? (
              <div className="space-y-1 p-4" aria-busy="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 rounded animate-pulse" />
                ))}
              </div>
            ) : pendingRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-sm font-medium text-[var(--color-neutral-600)]">No pending expenses</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      {['Date', 'Property', 'Category', 'Vendor', 'Amount', 'Days Pending', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pendingRows.map((r, i) => (
                      <tr key={r.id} className={cn('hover:bg-neutral-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFD]')}>
                        <td className="px-4 py-3 text-[var(--color-neutral-700)] whitespace-nowrap">
                          {format(new Date(r.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-neutral-700)]">{r.property_name}</td>
                        <td className="px-4 py-3 text-[var(--color-neutral-700)]">{r.category_name}</td>
                        <td className="px-4 py-3 text-[var(--color-neutral-500)]">{r.vendor ?? '—'}</td>
                        <td className="px-4 py-3 font-medium tabular-nums text-[var(--color-neutral-900)]">
                          {formatCurrency(r.amount, r.currency as 'AED' | 'INR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                            r.days_pending > 7 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          )}>
                            {r.days_pending}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleConfirm(r.id)}
                                className="px-3 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setEditId(r.id)}
                                className="px-3 py-1.5 rounded bg-neutral-50 hover:bg-neutral-100 text-[var(--color-neutral-700)] text-xs font-semibold transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : !isLoading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm font-medium text-[var(--color-neutral-600)]">No expense records found</p>
              {canEdit && (
                <button onClick={() => setAddOpen(true)} className="text-sm text-[#276EAC] hover:underline">
                  Add your first expense
                </button>
              )}
            </div>
          ) : (
            <ExpenseTable
              rows={rows}
              total={total}
              page={page}
              pageSize={pageSize}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              onPageChange={setPage}
              onEdit={(id) => setEditId(id)}
              onDelete={(id) => setDeleteId(id)}
              onConfirm={handleConfirm}
              role={role}
              loading={isLoading}
            />
          )}
        </div>
      </div>

      <ExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />
      <ExpenseModal
        open={!!editId}
        editId={editId}
        onClose={() => setEditId(null)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />
      <DeleteExpenseModal
        open={!!deleteId}
        recordId={deleteId}
        onClose={() => setDeleteId(null)}
        onSuccess={invalidate}
      />
    </>
  );
}
