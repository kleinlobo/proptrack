'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMonthlyChartData } from '@/hooks/use-dashboard';
import { formatCurrency } from '@/lib/currency/convert';

interface Props {
  propertyIds: string[] | null;
}

function ChartSkeleton() {
  return (
    <div
      className="h-64 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse"
      aria-busy="true"
    />
  );
}

function EmptyChart() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-[var(--color-neutral-500)]">No data for this period</p>
    </div>
  );
}

export function RevenueExpensesChart({ propertyIds }: Props) {
  const { data, isLoading } = useMonthlyChartData(propertyIds);

  const isEmpty = !isLoading && (!data || data.every((d) => d.revenue === 0 && d.expenses === 0));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">
        Revenue vs Expenses
      </p>
      <p className="text-sm text-[var(--color-neutral-500)] mb-6">Last 12 months</p>

      {isLoading ? (
        <ChartSkeleton />
      ) : isEmpty ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #F3F4F6',
                borderRadius: 6,
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.10)',
                fontFamily: 'DM Sans',
                fontSize: 12,
              }}
              formatter={(value: number) =>
                [value.toLocaleString(undefined, { maximumFractionDigits: 0 }), '']
              }
            />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: '#6B7280', fontFamily: 'DM Sans' }}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#276EAC" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#F59E0B" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
