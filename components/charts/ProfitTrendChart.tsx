'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useMonthlyChartData } from '@/hooks/use-dashboard';

interface Props {
  propertyIds: string[] | null;
}

export function ProfitTrendChart({ propertyIds }: Props) {
  const { data, isLoading } = useMonthlyChartData(propertyIds);

  const isEmpty =
    !isLoading &&
    (!data || data.every((d) => d.profit_AED === 0 && d.profit_INR === 0));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6">
      <p className="text-base font-semibold text-[var(--color-neutral-900)] mb-0.5">
        Monthly Net Profit Trend
      </p>
      <p className="text-xs text-[var(--color-neutral-500)] mb-5">
        Last 12 months · AED &amp; INR
      </p>

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
              <linearGradient id="gradAED" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#276EAC" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#276EAC" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradINR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              formatter={(value: number, name: string) => {
                const isINR = name.includes('₹');
                const formatted = isINR
                  ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                return [formatted, name];
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#6B7280', fontFamily: 'DM Sans' }}
            />
            <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="profit_AED"
              name="Ajman Villa (AED)"
              stroke="#276EAC"
              strokeWidth={2}
              fill="url(#gradAED)"
              dot={(props) => {
                const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload: { profit_AED: number } };
                const color = payload.profit_AED >= 0 ? '#276EAC' : '#EF4444';
                return <circle key={`aed-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke={color} />;
              }}
            />
            <Area
              type="monotone"
              dataKey="profit_INR"
              name="GOA River House (₹)"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#gradINR)"
              dot={(props) => {
                const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload: { profit_INR: number } };
                const color = payload.profit_INR >= 0 ? '#059669' : '#EF4444';
                return <circle key={`inr-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke={color} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
