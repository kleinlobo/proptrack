'use client';

import { useState, useCallback } from 'react';
import { PlusCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { IncomeTable } from '@/components/tables/IncomeTable';
import { FilterPanel, type FilterState } from '@/components/tables/FilterPanel';
import { IncomeModal } from '@/components/forms/IncomeModal';
import { DeleteIncomeModal } from '@/components/forms/DeleteIncomeModal';
import { useIncomeList, useScopedProperties } from '@/hooks/use-income';

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

export function IncomePageContent({ role, scopedPropertyIds }: Props) {
  const canEdit = role !== 'read_only';
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useIncomeList(filters, page, sortCol, sortDir, scopedPropertyIds);
  const { data: properties = [] } = useScopedProperties(scopedPropertyIds);

  function handleSort(col: string) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  }

  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    setPage(0);
  }

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['income-list'] });
  }, [queryClient]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Income</h1>
            <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">
              {total > 0 ? `${total} record${total !== 1 ? 's' : ''}` : 'No records'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#276EAC] hover:bg-[#1E5C91] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              Add Income
            </button>
          )}
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          properties={properties}
        />

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {!isLoading && rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm font-medium text-[var(--color-neutral-600)]">No income records found</p>
              {canEdit && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="text-sm text-[#276EAC] hover:underline"
                >
                  Add your first record
                </button>
              )}
            </div>
          ) : (
            <IncomeTable
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
              role={role}
              loading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Add modal */}
      <IncomeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />

      {/* Edit modal */}
      <IncomeModal
        open={!!editId}
        editId={editId}
        onClose={() => setEditId(null)}
        scopedPropertyIds={scopedPropertyIds}
        onSuccess={invalidate}
      />

      {/* Delete confirmation */}
      <DeleteIncomeModal
        open={!!deleteId}
        recordId={deleteId}
        onClose={() => setDeleteId(null)}
        onSuccess={invalidate}
      />
    </>
  );
}
