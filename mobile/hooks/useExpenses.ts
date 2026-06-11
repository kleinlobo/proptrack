import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ExpenseRow {
  id: string;
  date: string;
  property_id: string;
  property_name: string;
  base_currency: string;
  room_name: string | null;
  category_id: string;
  category_name: string;
  vendor: string | null;
  payment_method: string;
  amount: number;
  currency: string;
  amount_base: number;
  status: 'pending_confirmation' | 'confirmed';
  notes: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'credit_card', 'online_payment', 'cheque', 'other'];

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    staleTime: 300_000,
    queryFn: async (): Promise<ExpenseCategory[]> => {
      const { data } = await supabase
        .from('expense_categories')
        .select('id, name, parent_id')
        .is('deleted_at', null)
        .order('name');
      const cats = data ?? [];
      const parentMap = new Map(cats.map((c) => [c.id, c.name]));
      return cats.map((c) => ({
        id: c.id,
        name: c.name,
        parent_id: c.parent_id,
        parent_name: c.parent_id ? (parentMap.get(c.parent_id) ?? null) : null,
      }));
    },
  });
}

export function useExpenseList(
  propertyIds: string[],
  filters: { propertyId?: string; status?: 'all' | 'pending_confirmation' | 'confirmed' }
) {
  return useQuery({
    queryKey: ['expense-list', propertyIds, filters],
    staleTime: 30_000,
    queryFn: async (): Promise<ExpenseRow[]> => {
      let q = supabase
        .from('expense_records')
        .select('id, date, property_id, room_id, category_id, vendor, payment_method, amount, currency, amount_base, status, notes, properties(name, base_currency), rooms(name), expense_categories!expense_records_category_id_fkey(name)')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(100);

      if (propertyIds.length > 0) q = q.in('property_id', propertyIds);
      if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);

      const { data } = await q;
      return (data ?? []).map((r) => {
        const prop = r.properties as unknown as { name: string; base_currency: string } | null;
        return {
          id: r.id,
          date: r.date,
          property_id: r.property_id,
          property_name: prop?.name ?? '—',
          base_currency: prop?.base_currency ?? r.currency,
          room_name: (r.rooms as unknown as { name: string } | null)?.name ?? null,
          category_id: r.category_id,
          category_name: (r.expense_categories as unknown as { name: string } | null)?.name ?? '—',
          vendor: r.vendor,
          payment_method: r.payment_method,
          amount: r.amount,
          currency: r.currency,
          amount_base: r.amount_base,
          status: r.status as 'pending_confirmation' | 'confirmed',
          notes: r.notes,
        };
      });
    },
  });
}

export function useExpenseMutations() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['expense-list'] });
    qc.invalidateQueries({ queryKey: ['kpi-totals'] });
    qc.invalidateQueries({ queryKey: ['recent-activity'] });
    qc.invalidateQueries({ queryKey: ['pending-count'] });
  }, [qc]);

  const createExpense = useCallback(async (payload: {
    property_id: string;
    room_id?: string;
    category_id: string;
    vendor?: string;
    payment_method: string;
    amount: number;
    currency: string;
    date: string;
    notes?: string;
    status?: 'confirmed' | 'pending_confirmation';
  }) => {
    setSaving(true); setError('');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('expense_records').insert({
      ...payload,
      amount_base: payload.amount,
      exchange_rate_used: 1,
      status: payload.status ?? 'confirmed',
      created_by: authUser?.id,
      updated_by: authUser?.id,
    });
    setSaving(false);
    if (err) { setError('Could not save. Please try again.'); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  const updateExpense = useCallback(async (id: string, payload: Partial<{
    category_id: string; vendor: string; payment_method: string;
    amount: number; currency: string; date: string; notes: string;
  }>) => {
    setSaving(true); setError('');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('expense_records')
      .update({ ...payload, ...(payload.amount ? { amount_base: payload.amount } : {}), updated_by: authUser?.id, updated_at: new Date().toISOString() })
      .eq('id', id);
    setSaving(false);
    if (err) { setError('Could not update. Please try again.'); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  const confirmExpense = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('expense_records')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) { setError('Could not confirm.'); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  const deleteExpense = useCallback(async (id: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;
    const { error: err } = await supabase
      .from('expense_records')
      .update({ deleted_at: new Date().toISOString(), deleted_by: authUser.id })
      .eq('id', id)
      .is('deleted_at', null);
    if (err) return false;
    invalidate();
    return true;
  }, [invalidate]);

  return { saving, error, setError, createExpense, updateExpense, confirmExpense, deleteExpense };
}
