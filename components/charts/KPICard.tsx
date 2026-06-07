'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  primaryValue: string;
  secondaryValue?: string;
  trend?: { pct: number; label: string };
  accentColor: string;
  iconBg: string;
  iconColor: string;
  Icon: LucideIcon;
  loading?: boolean;
  onClick?: () => void;
}

export function KPICardSkeleton() {
  return (
    <div
      className="h-32 bg-neutral-100 dark:bg-neutral-700 rounded-md animate-pulse"
      aria-busy="true"
    />
  );
}

export function KPICard({
  title,
  primaryValue,
  secondaryValue,
  trend,
  accentColor,
  iconBg,
  iconColor,
  Icon,
  loading,
  onClick,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />;

  const isPositiveTrend = trend && trend.pct >= 0;

  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-md shadow-sm',
        'border border-neutral-100 dark:border-neutral-700',
        'border-l-4 p-6',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      style={{ borderLeftColor: accentColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-neutral-500)] mb-1">{title}</p>
          <p className="text-3xl font-bold text-[var(--color-neutral-900)] tabular-nums">
            {primaryValue}
          </p>
          {secondaryValue && (
            <p className="text-sm text-[var(--color-neutral-500)] mt-1">{secondaryValue}</p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-md flex-shrink-0 ml-3', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} aria-hidden="true" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          {isPositiveTrend ? (
            <ArrowUp className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
          )}
          <span
            className={cn(
              'font-medium',
              isPositiveTrend ? 'text-green-700' : 'text-red-700'
            )}
          >
            {isPositiveTrend ? '+' : ''}
            {trend.pct.toFixed(1)}%
          </span>
          <span className="text-[var(--color-neutral-500)]">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
