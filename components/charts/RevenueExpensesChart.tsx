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

interface Props {
  propertyIds: string[] | null;
}

function fmt(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

export function RevenueExpensesChart({ propertyIds }: Props) {
  const { data, isLoading } = useMonthlyChartData(propertyIds);

  const isEmpty =
    !isLoading &&
    (!data ||
      data.every(
        (d) =>
          d.revenue_AED === 0 &&
          d.revenue_INR === 0 &&
          d.expenses_AED === 0 &&
          d.expenses_INR === 0
      ));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-0.5">
        Revenue vs Expenses
      </p>
      <p className="text-xs text-[var(--color-neutral-500)] mb-5">
        Last 12 months · AED (solid) &amp; INR (hatched)
      </p>

      {isLoading ? (
        <div className="h-64 bg-neutral-100 rounded-md animate-pulse" aria-busy="true" />
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-[var(--color-neutral-500)]">No data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={data} barCategoryGap="30%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
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
              formatter={(value: number, name: string) => [
                name.includes('INR') || name.includes('₹')
                  ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                name,
              ]}
            />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, color: '#6B7280', fontFamily: 'DM Sans' }}
            />
            {/* Revenue stack — blue shades */}
            <Bar dataKey="revenue_AED" name="Revenue (AED)" stackId="rev" fill="#276EAC" radius={[0, 0, 0, 0]} />
            <Bar dataKey="revenue_INR" name="Revenue (₹)" stackId="rev" fill="#7CB9E8" radius={[2, 2, 0, 0]} />
            {/* Expenses stack — amber shades */}
            <Bar dataKey="expenses_AED" name="Expenses (AED)" stackId="exp" fill="#D97706" radius={[0, 0, 0, 0]} />
            <Bar dataKey="expenses_INR" name="Expenses (₹)" stackId="exp" fill="#FCD34D" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
