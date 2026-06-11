import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface IncomeRow {
  id: string;
  date: string;
  property_id: string;
  property_name: string;
  base_currency: string;
  room_name: string | null;
  income_source: string;
  amount: number;
  currency: string;
  amount_base: number;
  notes: string | null;
  status: string;
}

export interface Property {
  id: string;
  name: string;
  base_currency: string;
}

export interface Room {
  id: string;
  name: string;
  property_id: string;
}

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    staleTime: 300_000,
    queryFn: async (): Promise<Property[]> => {
      const { data } = await supabase
        .from('properties')
        .select('id, name, base_currency')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      return (data ?? []) as Property[];
    },
  });
}

export function useRooms(propertyId?: string) {
  return useQuery({
    queryKey: ['rooms', propertyId],
    staleTime: 300_000,
    enabled: !!propertyId,
    queryFn: async (): Promise<Room[]> => {
      const { data } = await supabase
        .from('rooms')
        .select('id, name, property_id')
        .eq('property_id', propertyId!)
        .is('deleted_at', null)
        .order('name');
      return (data ?? []) as Room[];
    },
  });
}

export function useIncomeList(propertyIds: string[], filters: { propertyId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  return useQuery({
    queryKey: ['income-list', propertyIds, filters],
    staleTime: 30_000,
    queryFn: async (): Promise<IncomeRow[]> => {
      let q = supabase
        .from('income_records')
        .select('id, date, property_id, room_id, income_source, amount, currency, amount_base, notes, status, properties(name, base_currency), rooms(name)')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(100);

      if (propertyIds.length > 0) q = q.in('property_id', propertyIds);
      if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
      if (filters.dateFrom) q = q.gte('date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('date', filters.dateTo);

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
          income_source: r.income_source,
          amount: r.amount,
          currency: r.currency,
          amount_base: r.amount_base,
          notes: r.notes,
          status: r.status,
        };
      });
    },
  });
}

export const INCOME_SOURCES = [
  'airbnb', 'booking_com', 'direct_booking', 'cash', 'monthly_rental', 'other',
];

export const CURRENCIES: Record<string, string[]> = {
  AED: ['AED'],
  INR: ['INR'],
};

export function useIncomeMutations() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['income-list'] });
    qc.invalidateQueries({ queryKey: ['kpi-totals'] });
    qc.invalidateQueries({ queryKey: ['recent-activity'] });
  }, [qc]);

  const createIncome = useCallback(async (payload: {
    property_id: string;
    room_id?: string;
    income_source: string;
    amount: number;
    currency: string;
    date: string;
    notes?: string;
  }) => {
    setSaving(true); setError('');
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const { error: err } = await supabase.from('income_records').insert({
      ...payload,
      amount_base: payload.amount,
      exchange_rate_used: 1,
      status: 'confirmed',
      created_by: authUser?.id,
      updated_by: authUser?.id,
    });
    setSaving(false);
    if (err) { setError('Could not save. Please try again.'); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  const updateIncome = useCallback(async (id: string, payload: Partial<{
    income_source: string; amount: number; currency: string; date: string; notes: string; room_id: string;
  }>) => {
    setSaving(true); setError('');
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('income_records')
      .update({ ...payload, ...(payload.amount ? { amount_base: payload.amount } : {}), updated_by: authUser?.id, updated_at: new Date().toISOString() })
      .eq('id', id);
    setSaving(false);
    if (err) { setError('Could not update. Please try again.'); return false; }
    invalidate();
    return true;
  }, [invalidate]);

  const deleteIncome = useCallback(async (id: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return false;
    const { error: err } = await supabase
      .from('income_records')
      .update({ deleted_at: new Date().toISOString(), deleted_by: authUser.id })
      .eq('id', id)
      .is('deleted_at', null);
    if (err) return false;
    invalidate();
    return true;
  }, [invalidate]);

  return { saving, error, setError, createIncome, updateIncome, deleteIncome };
}
