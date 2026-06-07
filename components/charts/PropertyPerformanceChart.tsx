'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { usePropertyPerformance } from '@/hooks/use-dashboard';

export function PropertyPerformanceChart() {
  const { data, isLoading } = usePropertyPerformance();

  const isEmpty = !isLoading && (!data || data.length === 0);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">
        Property Performance
      </p>
      <p className="text-sm text-[var(--color-neutral-500)] mb-6">Net profit by property</p>

      {isLoading ? (
        <div className="h-64 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse" aria-busy="true" />
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-[var(--color-neutral-500)]">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <YAxis
              type="category"
              dataKey="property_name"
              tick={{ fontSize: 12, fill: '#6B7280', fontFamily: 'DM Sans' }}
              axisLine={false}
              tickLine={false}
              width={120}
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
              formatter={(value: number) => [
                value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                'Net Profit',
              ]}
            />
            <Bar dataKey="net_profit_base" radius={[0, 2, 2, 0]}>
              {data!.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.net_profit_base >= 0 ? '#276EAC' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
