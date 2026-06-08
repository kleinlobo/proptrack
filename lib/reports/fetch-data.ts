import { SupabaseClient } from '@supabase/supabase-js';
import type { ReportParams, ReportData, IncomeLineItem, ExpenseLineItem, PropertySummary } from './types';

export async function fetchReportData(
  supabase: SupabaseClient,
  params: ReportParams
): Promise<ReportData> {
  const { date_from, date_to, property_ids } = params;

  // --- Income ---
  let incomeQ = supabase
    .from('income_records')
    .select('date, income_source, amount, currency, amount_base, notes, properties(name, base_currency), rooms(name)')
    .is('deleted_at', null)
    .gte('date', date_from)
    .lte('date', date_to)
    .order('date', { ascending: true });

  if (property_ids && property_ids.length > 0) {
    incomeQ = incomeQ.in('property_id', property_ids);
  }

  const { data: incomeRaw } = await incomeQ;

  const income: IncomeLineItem[] = (incomeRaw ?? []).map((r) => {
    const prop = r.properties as unknown as { name: string; base_currency: string } | null;
    return {
      date: r.date,
      property_name: prop?.name ?? '—',
      room_name: (r.rooms as unknown as { name: string } | null)?.name ?? null,
      income_source: r.income_source,
      amount: r.amount,
      currency: r.currency,
      amount_base: r.amount_base,
      base_currency: prop?.base_currency ?? r.currency,
      notes: r.notes,
    };
  });

  // --- Expenses ---
  let expenseQ = supabase
    .from('expense_records')
    .select('date, amount, currency, amount_base, vendor, payment_method, notes, properties(name, base_currency), rooms(name), expense_categories!expense_records_category_id_fkey(name)')
    .is('deleted_at', null)
    .gte('date', date_from)
    .lte('date', date_to)
    .order('date', { ascending: true });

  if (property_ids && property_ids.length > 0) {
    expenseQ = expenseQ.in('property_id', property_ids);
  }

  const { data: expenseRaw } = await expenseQ;

  const expenses: ExpenseLineItem[] = (expenseRaw ?? []).map((r) => {
    const prop = r.properties as unknown as { name: string; base_currency: string } | null;
    return {
      date: r.date,
      property_name: prop?.name ?? '—',
      room_name: (r.rooms as unknown as { name: string } | null)?.name ?? null,
      category_name: (r.expense_categories as unknown as { name: string } | null)?.name ?? '—',
      vendor: r.vendor,
      payment_method: r.payment_method,
      amount: r.amount,
      currency: r.currency,
      amount_base: r.amount_base,
      base_currency: prop?.base_currency ?? r.currency,
      notes: r.notes,
    };
  });

  // --- Property summaries ---
  const propMap = new Map<string, PropertySummary>();

  for (const item of income) {
    const key = item.property_name;
    const existing = propMap.get(key) ?? {
      property_id: key,
      property_name: item.property_name,
      base_currency: item.base_currency,
      total_income_base: 0,
      total_expenses_base: 0,
      net_profit_base: 0,
    };
    existing.total_income_base += item.amount_base;
    existing.net_profit_base += item.amount_base;
    propMap.set(key, existing);
  }

  for (const item of expenses) {
    const key = item.property_name;
    const existing = propMap.get(key) ?? {
      property_id: key,
      property_name: item.property_name,
      base_currency: item.base_currency,
      total_income_base: 0,
      total_expenses_base: 0,
      net_profit_base: 0,
    };
    existing.total_expenses_base += item.amount_base;
    existing.net_profit_base -= item.amount_base;
    propMap.set(key, existing);
  }

  const property_summaries = Array.from(propMap.values());

  const grand_total_income = income.reduce((s, r) => s + r.amount_base, 0);
  const grand_total_expenses = expenses.reduce((s, r) => s + r.amount_base, 0);

  return {
    params,
    generated_at: new Date().toISOString(),
    income,
    expenses,
    property_summaries,
    grand_total_income,
    grand_total_expenses,
    grand_net_profit: grand_total_income - grand_total_expenses,
  };
}
