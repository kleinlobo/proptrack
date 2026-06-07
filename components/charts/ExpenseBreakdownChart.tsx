'use client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useExpenseCategoryBreakdown } from '@/hooks/use-dashboard';
import type { DateRange } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';

interface Props {
  range: DateRange;
  propertyIds: string[] | null;
}

const SLICE_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#9CA3AF'];

export function ExpenseBreakdownChart({ range, propertyIds }: Props) {
  const { data, isLoading } = useExpenseCategoryBreakdown(range, propertyIds);
  const router = useRouter();

  const isEmpty = !isLoading && (!data || data.length === 0 || data.every((d) => d.value === 0));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSliceClick(sectorData: any) {
    const name: string | undefined = sectorData?.name;
    if (!name) return;
    router.push(`/expenses?category=${encodeURIComponent(name)}`);
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">
        Expense Breakdown
      </p>
      <p className="text-sm text-[var(--color-neutral-500)] mb-6">By category, current period</p>

      {isLoading ? (
        <div className="h-64 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse" aria-busy="true" />
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-[var(--color-neutral-500)]">No data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              onClick={handleSliceClick}
              className="cursor-pointer"
            >
              {(data ?? []).map((_entry, index) => (
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
                value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
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
