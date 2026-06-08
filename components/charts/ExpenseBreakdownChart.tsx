'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useExpenseCategoryBreakdown } from '@/hooks/use-dashboard';
import type { DateRange } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  range: DateRange;
  propertyIds: string[] | null;
}

const SLICE_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#9CA3AF'];

export function ExpenseBreakdownChart({ range, propertyIds }: Props) {
  const { data, isLoading } = useExpenseCategoryBreakdown(range, propertyIds);
  const router = useRouter();
  const [currency, setCurrency] = useState<'aed' | 'inr'>('aed');

  const activeData = (currency === 'aed' ? data?.aed : data?.inr) ?? [];
  const isEmpty = !isLoading && activeData.every((d) => d.value === 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSliceClick(sectorData: any) {
    const name: string | undefined = sectorData?.name;
    if (!name) return;
    router.push(`/expenses?category=${encodeURIComponent(name)}`);
  }

  const hasAED = (data?.aed ?? []).some((d) => d.value > 0);
  const hasINR = (data?.inr ?? []).some((d) => d.value > 0);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-base font-semibold text-[var(--color-neutral-900)]">
          Expense Breakdown
        </p>
        {!isLoading && (hasAED || hasINR) && (
          <div className="flex rounded-md border border-neutral-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setCurrency('aed')}
              className={cn(
                'px-2.5 py-1 transition-colors',
                currency === 'aed'
                  ? 'bg-[#276EAC] text-white'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50'
              )}
            >
              AED
            </button>
            <button
              onClick={() => setCurrency('inr')}
              className={cn(
                'px-2.5 py-1 transition-colors border-l border-neutral-200',
                currency === 'inr'
                  ? 'bg-[#059669] text-white'
                  : 'bg-white text-neutral-500 hover:bg-neutral-50'
              )}
            >
              INR
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-[var(--color-neutral-500)] mb-4">By category, current period</p>

      {isLoading ? (
        <div className="h-64 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse" aria-busy="true" />
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-[var(--color-neutral-500)]">
            No {currency === 'aed' ? 'AED' : 'INR'} expenses for this period
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <PieChart>
            <Pie
              data={activeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              onClick={handleSliceClick}
              className="cursor-pointer"
            >
              {activeData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #F3F4F6',
                borderRadius: 6,
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.10)',
                fontFamily: 'DM Sans',
                fontSize: 12,
              }}
              formatter={(value: number) => [
                currency === 'aed'
                  ? `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                  : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                '',
              ]}
            />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: '#6B7280', fontFamily: 'DM Sans' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
