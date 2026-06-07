import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  startOfYear,
  endOfYear,
  subYears,
  parseISO,
} from 'date-fns';

export type PeriodKey = 'this_month' | 'last_month' | 'this_fy' | 'last_fy' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FYSettings {
  start_month: number; // 1–12
  start_day: number;   // 1–28
}

/** Returns the start of the current financial year given settings and reference date. */
function getFYStart(fy: FYSettings, ref: Date): Date {
  const y = ref.getFullYear();
  const candidate = new Date(y, fy.start_month - 1, fy.start_day);
  return candidate > ref ? new Date(y - 1, fy.start_month - 1, fy.start_day) : candidate;
}

export function getPeriodRange(
  period: PeriodKey,
  fy?: FYSettings,
  custom?: DateRange
): DateRange {
  const now = new Date();

  switch (period) {
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };

    case 'last_month': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }

    case 'this_fy': {
      const fySettings = fy ?? { start_month: 4, start_day: 1 };
      const fyStart = getFYStart(fySettings, now);
      return { from: fyStart, to: now };
    }

    case 'last_fy': {
      const fySettings = fy ?? { start_month: 4, start_day: 1 };
      const fyStart = getFYStart(fySettings, now);
      const prevFYStart = new Date(
        fyStart.getFullYear() - 1,
        fyStart.getMonth(),
        fyStart.getDate()
      );
      const prevFYEnd = new Date(fyStart.getTime() - 1);
      return { from: prevFYStart, to: prevFYEnd };
    }

    case 'custom':
      return custom ?? { from: startOfMonth(now), to: endOfMonth(now) };

    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/** Format as YYYY-MM-DD for Supabase date comparisons */
export function toSupabaseDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Format as YYYY-MM-01 (month boundary for the view's `month` column) */
export function toMonthStart(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM-dd');
}

/** Last 12 complete months (for charts) */
export function last12MonthRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(subMonths(now, 11)), to: endOfMonth(now) };
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_fy: 'This Financial Year',
  last_fy: 'Last Financial Year',
  custom: 'Custom Range',
};

/** Parse the period key from URL search params, default this_month */
export function parsePeriod(raw: string | null): PeriodKey {
  const valid: PeriodKey[] = ['this_month', 'last_month', 'this_fy', 'last_fy', 'custom'];
  return valid.includes(raw as PeriodKey) ? (raw as PeriodKey) : 'this_month';
}

/** Format display value for a date range */
export function formatPeriodDisplay(range: DateRange): string {
  return `${format(range.from, 'dd MMM yyyy')} – ${format(range.to, 'dd MMM yyyy')}`;
}
