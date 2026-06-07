'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { TrendingUp, Receipt } from 'lucide-react';
import { useRecentActivity } from '@/hooks/use-dashboard';
import { formatCurrency } from '@/lib/currency/format';

interface Props {
  propertyIds: string[] | null;
  role: 'super_admin' | 'property_manager' | 'read_only';
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse" aria-busy="true">
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
          <div className="h-4 w-1/4 bg-neutral-100 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function RecentActivity({ propertyIds, role }: Props) {
  const { data, isLoading } = useRecentActivity(propertyIds);
  const canEdit = role !== 'read_only';

  function formatDate(d: string) {
    try {
      return format(new Date(d), 'dd MMM yyyy');
    } catch {
      return d;
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-md shadow-sm border border-neutral-100 dark:border-neutral-700 p-6 flex flex-col gap-8">
      {/* Income */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--color-brand-blue)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">Recent Income</p>
        </div>
        {isLoading ? (
          <ActivitySkeleton />
        ) : !data?.income?.length ? (
          <p className="text-sm text-[var(--color-neutral-500)]">No recent activity yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {data.income.map((item) =>
              canEdit ? (
                <Link
                  key={item.id}
                  href={`/income?edit=${item.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-700)] truncate">
                      {item.property_name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      {item.label} · {formatDate(item.date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-green-700 ml-3 flex-shrink-0">
                    {formatCurrency(item.amount, item.currency as 'AED' | 'INR')}
                  </p>
                </Link>
              ) : (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-700)] truncate">
                      {item.property_name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      {item.label} · {formatDate(item.date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-green-700 ml-3 flex-shrink-0">
                    {formatCurrency(item.amount, item.currency as 'AED' | 'INR')}
                  </p>
                </div>
              )
            )}
          </div>
        )}
        <Link
          href="/income"
          className="mt-3 inline-block text-xs font-medium text-[var(--color-brand-blue)] hover:underline"
        >
          View all Income →
        </Link>
      </div>

      {/* Expenses */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-[var(--color-warning)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">Recent Expenses</p>
        </div>
        {isLoading ? (
          <ActivitySkeleton />
        ) : !data?.expenses?.length ? (
          <p className="text-sm text-[var(--color-neutral-500)]">No recent activity yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {data.expenses.map((item) =>
              canEdit ? (
                <Link
                  key={item.id}
                  href={`/expenses?edit=${item.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-700)] truncate">
                      {item.property_name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      {item.label} · {formatDate(item.date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-error)] ml-3 flex-shrink-0">
                    {formatCurrency(item.amount, item.currency as 'AED' | 'INR')}
                  </p>
                </Link>
              ) : (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-neutral-700)] truncate">
                      {item.property_name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      {item.label} · {formatDate(item.date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-error)] ml-3 flex-shrink-0">
                    {formatCurrency(item.amount, item.currency as 'AED' | 'INR')}
                  </p>
                </div>
              )
            )}
          </div>
        )}
        <Link
          href="/expenses"
          className="mt-3 inline-block text-xs font-medium text-[var(--color-brand-blue)] hover:underline"
        >
          View all Expenses →
        </Link>
      </div>
    </div>
  );
}
