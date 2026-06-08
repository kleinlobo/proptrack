'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface RecurringRow {
  id: string;
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
  recurrence_type: string;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  notes: string | null;
}

export function useRecurringList(scopedPropertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['recurring-list', scopedPropertyIds],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('recurring_expenses')
        .select(
          `id, property_id, category_id, vendor, payment_method, amount, currency,
           recurrence_type, day_of_month, start_date, end_date, next_due_date, is_active, notes, room_id,
           properties(name, base_currency),
           rooms(name),
           expense_categories!recurring_expenses_category_id_fkey(name)`
        )
        .is('deleted_at', null)
        .order('next_due_date', { ascending: true });

      if (scopedPropertyIds && scopedPropertyIds.length > 0) {
        query = query.in('property_id', scopedPropertyIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((r): RecurringRow => {
        const prop = r.properties as { name: string; base_currency: string } | null;
        const cat = r.expense_categories as { name: string } | null;
        return {
          id: r.id,
          property_id: r.property_id,
          property_name: prop?.name ?? '—',
          base_currency: prop?.base_currency ?? r.currency,
          room_name: (r.rooms as { name: string } | null)?.name ?? null,
          category_id: r.category_id,
          category_name: cat?.name ?? '—',
          vendor: r.vendor,
          payment_method: r.payment_method,
          amount: r.amount,
          currency: r.currency,
          recurrence_type: r.recurrence_type,
          day_of_month: r.day_of_month,
          start_date: r.start_date,
          end_date: r.end_date,
          next_due_date: r.next_due_date,
          is_active: r.is_active,
          notes: r.notes,
        };
      });
    },
  });
}
