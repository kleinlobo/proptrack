'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useMonthlyChartData } from '@/hooks/use-dashboard';

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

export function ProfitTrendChart({ propertyIds }: Props) {
  const { data, isLoading } = useMonthlyChartData(propertyIds);

  const isEmpty = !isLoading && (!data || data.every((d) => d.profit === 0));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">
        Monthly Net Profit Trend
      </p>
      <p className="text-sm text-[var(--color-neutral-500)] mb-6">Last 12 months</p>

      {isLoading ? (
        <div className="h-64 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse" aria-busy="true" />
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-[var(--color-neutral-500)]">No data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#146B3A" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#146B3A" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
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
            <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#146B3A"
              strokeWidth={2}
              fill="url(#profitGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = payload.profit >= 0 ? '#146B3A' : '#EF4444';
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke={color} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
