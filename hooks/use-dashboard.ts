'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toMonthStart, last12MonthRange, type DateRange } from '@/lib/date-utils';

// ─── Revenue KPIs ────────────────────────────────────────────────────────────

interface CurrencyTotals {
  aed: number;
  inr: number;
}

export function useRevenueTotals(range: DateRange, propertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['revenue-totals', range.from.toISOString(), range.to.toISOString(), propertyIds],
    staleTime: 60_000,
    queryFn: async (): Promise<CurrencyTotals> => {
      let query = supabase
        .from('revenue_summary_v')
        .select('total_amount_base, base_currency')
        .gte('month', toMonthStart(range.from))
        .lte('month', toMonthStart(range.to));

      if (propertyIds && propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).reduce(
        (acc, row) => {
          if (row.base_currency === 'AED') acc.aed += row.total_amount_base ?? 0;
          if (row.base_currency === 'INR') acc.inr += row.total_amount_base ?? 0;
          return acc;
        },
        { aed: 0, inr: 0 }
      );
    },
  });
}

export function useExpenseTotals(range: DateRange, propertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['expense-totals', range.from.toISOString(), range.to.toISOString(), propertyIds],
    staleTime: 60_000,
    queryFn: async (): Promise<CurrencyTotals> => {
      let query = supabase
        .from('expense_summary_v')
        .select('total_amount_base, base_currency')
        .gte('month', toMonthStart(range.from))
        .lte('month', toMonthStart(range.to));

      if (propertyIds && propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).reduce(
        (acc, row) => {
          if (row.base_currency === 'AED') acc.aed += row.total_amount_base ?? 0;
          if (row.base_currency === 'INR') acc.inr += row.total_amount_base ?? 0;
          return acc;
        },
        { aed: 0, inr: 0 }
      );
    },
  });
}

export function usePendingCount(propertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['pending-count', propertyIds],
    staleTime: 30_000,
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from('expense_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_confirmation')
        .is('deleted_at', null);

      if (propertyIds && propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// ─── Charts ─────────────────────────────────────────────────────────────────

export interface MonthlyBarData {
  month: string;
  revenue_AED: number;
  expenses_AED: number;
  revenue_INR: number;
  expenses_INR: number;
  profit_AED: number;
  profit_INR: number;
}

export function useMonthlyChartData(propertyIds: string[] | null) {
  const supabase = createClient();
  const range = last12MonthRange();
  return useQuery({
    queryKey: ['monthly-chart', propertyIds],
    staleTime: 60_000,
    queryFn: async (): Promise<MonthlyBarData[]> => {
      let revQ = supabase
        .from('revenue_summary_v')
        .select('month, total_amount_base, base_currency')
        .gte('month', toMonthStart(range.from))
        .lte('month', toMonthStart(range.to));

      let expQ = supabase
        .from('expense_summary_v')
        .select('month, total_amount_base, base_currency')
        .gte('month', toMonthStart(range.from))
        .lte('month', toMonthStart(range.to));

      if (propertyIds?.length) {
        revQ = revQ.in('property_id', propertyIds);
        expQ = expQ.in('property_id', propertyIds);
      }

      const [{ data: revData, error: revErr }, { data: expData, error: expErr }] =
        await Promise.all([revQ, expQ]);

      if (revErr) throw revErr;
      if (expErr) throw expErr;

      type MonthEntry = { revenue_AED: number; expenses_AED: number; revenue_INR: number; expenses_INR: number };
      const monthMap = new Map<string, MonthEntry>();

      for (const row of revData ?? []) {
        if (!row.month) continue;
        const key = row.month.slice(0, 7);
        const cur = monthMap.get(key) ?? { revenue_AED: 0, expenses_AED: 0, revenue_INR: 0, expenses_INR: 0 };
        if (row.base_currency === 'AED') cur.revenue_AED += row.total_amount_base ?? 0;
        else cur.revenue_INR += row.total_amount_base ?? 0;
        monthMap.set(key, cur);
      }
      for (const row of expData ?? []) {
        if (!row.month) continue;
        const key = row.month.slice(0, 7);
        const cur = monthMap.get(key) ?? { revenue_AED: 0, expenses_AED: 0, revenue_INR: 0, expenses_INR: 0 };
        if (row.base_currency === 'AED') cur.expenses_AED += row.total_amount_base ?? 0;
        else cur.expenses_INR += row.total_amount_base ?? 0;
        monthMap.set(key, cur);
      }

      const result: MonthlyBarData[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const e = monthMap.get(key) ?? { revenue_AED: 0, expenses_AED: 0, revenue_INR: 0, expenses_INR: 0 };
        result.push({
          month: label,
          ...e,
          profit_AED: e.revenue_AED - e.expenses_AED,
          profit_INR: e.revenue_INR - e.expenses_INR,
        });
      }

      return result;
    },
  });
}

export interface CategoryBreakdown {
  name: string;
  value: number;
}

export interface CategoryBreakdownByCurrency {
  aed: CategoryBreakdown[];
  inr: CategoryBreakdown[];
}

export function useExpenseCategoryBreakdown(range: DateRange, propertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['expense-breakdown', range.from.toISOString(), range.to.toISOString(), propertyIds],
    staleTime: 60_000,
    queryFn: async (): Promise<CategoryBreakdownByCurrency> => {
      let query = supabase
        .from('expense_summary_v')
        .select('category_parent, total_amount_base, base_currency')
        .gte('month', toMonthStart(range.from))
        .lte('month', toMonthStart(range.to))
        .not('category_parent', 'is', null);

      if (propertyIds && propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const aedMap = new Map<string, number>();
      const inrMap = new Map<string, number>();

      for (const row of data ?? []) {
        const name = row.category_parent ?? 'Other';
        const amount = row.total_amount_base ?? 0;
        if (row.base_currency === 'AED') {
          aedMap.set(name, (aedMap.get(name) ?? 0) + amount);
        } else {
          inrMap.set(name, (inrMap.get(name) ?? 0) + amount);
        }
      }

      const toSorted = (m: Map<string, number>) =>
        Array.from(m.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

      return { aed: toSorted(aedMap), inr: toSorted(inrMap) };
    },
  });
}

export interface PropertyPerf {
  property_name: string;
  total_revenue_base: number;
  total_expenses_base: number;
  net_profit_base: number;
  base_currency: string;
}

export function usePropertyPerformance() {
  const supabase = createClient();
  return useQuery({
    queryKey: ['property-performance'],
    staleTime: 60_000,
    queryFn: async (): Promise<PropertyPerf[]> => {
      const { data, error } = await supabase
        .from('property_performance_v')
        .select('property_name, total_revenue_base, total_expenses_base, net_profit_base, base_currency')
        .order('net_profit_base', { ascending: false });

      if (error) throw error;
      return (data ?? []) as PropertyPerf[];
    },
  });
}

// ─── Recent Activity ─────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  date: string;
  property_name: string;
  label: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
}

export function useRecentActivity(propertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['recent-activity', propertyIds],
    staleTime: 30_000,
    queryFn: async (): Promise<{ income: ActivityItem[]; expenses: ActivityItem[] }> => {
      let incomeQ = supabase
        .from('income_records')
        .select('id, date, amount, currency, income_source, properties(name)')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(5);

      let expenseQ = supabase
        .from('expense_records')
        .select('id, date, amount, currency, expense_categories(name), properties(name)')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(5);

      if (propertyIds && propertyIds.length > 0) {
        incomeQ = incomeQ.in('property_id', propertyIds);
        expenseQ = expenseQ.in('property_id', propertyIds);
      }

      const [{ data: inc }, { data: exp }] = await Promise.all([incomeQ, expenseQ]);

      const mapIncome = (row: NonNullable<typeof inc>[number]): ActivityItem => ({
        id: row.id,
        date: row.date,
        property_name: (row.properties as { name: string } | null)?.name ?? '—',
        label: row.income_source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        amount: row.amount,
        currency: row.currency,
        type: 'income',
      });

      const mapExpense = (row: NonNullable<typeof exp>[number]): ActivityItem => ({
        id: row.id,
        date: row.date,
        property_name: (row.properties as { name: string } | null)?.name ?? '—',
        label: (row.expense_categories as { name: string } | null)?.name ?? '—',
        amount: row.amount,
        currency: row.currency,
        type: 'expense',
      });

      return {
        income: (inc ?? []).map(mapIncome),
        expenses: (exp ?? []).map(mapExpense),
      };
    },
  });
}
