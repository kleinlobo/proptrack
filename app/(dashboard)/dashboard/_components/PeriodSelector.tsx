'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PeriodKey, PERIOD_LABELS } from '@/lib/date-utils';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_fy', label: 'This FY' },
  { key: 'last_fy', label: 'Last FY' },
];

interface PeriodSelectorProps {
  activePeriod: PeriodKey;
}

export function PeriodSelector({ activePeriod }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(key: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', key);
    if (key !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--color-neutral-100)] rounded-md w-fit">
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => select(key)}
          className={cn(
            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
            activePeriod === key
              ? 'bg-[var(--color-white)] text-[var(--color-neutral-900)] shadow-sm'
              : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
