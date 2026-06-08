'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface ExpenseFilters {
  search?: string;
  property_ids?: string[];
  category_ids?: string[];
  currencies?: string[];
  date_from?: string;
  date_to?: string;
  status?: 'all' | 'pending_confirmation' | 'confirmed';
}

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
  attachment_url: string | null;
  notes: string | null;
  created_by_name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
}

export interface PendingRow {
  id: string;
  date: string;
  property_name: string;
  room_name: string | null;
  category_name: string;
  category_parent: string | null;
  vendor: string | null;
  amount: number;
  currency: string;
  amount_base: number;
  days_pending: number;
}

const PAGE_SIZE = 50;

export function useExpenseList(
  filters: ExpenseFilters,
  page: number,
  sortCol: string,
  sortDir: 'asc' | 'desc',
  scopedPropertyIds: string[] | null
) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['expense-list', filters, page, sortCol, sortDir, scopedPropertyIds],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('expense_records')
        .select(
          `id, date, property_id, category_id, vendor, payment_method, amount, currency, amount_base, status, attachment_url, notes,
           properties(name, base_currency),
           rooms(name),
           expense_categories!expense_records_category_id_fkey(name),
           creator:user_profiles!expense_records_created_by_fkey(full_name)`,
          { count: 'exact' }
        )
        .is('deleted_at', null);

      if (scopedPropertyIds && scopedPropertyIds.length > 0) {
        query = query.in('property_id', scopedPropertyIds);
      }
      if (filters.property_ids?.length) query = query.in('property_id', filters.property_ids);
      if (filters.category_ids?.length) query = query.in('category_id', filters.category_ids);
      if (filters.currencies?.length) query = query.in('currency', filters.currencies);
      if (filters.date_from) query = query.gte('date', filters.date_from);
      if (filters.date_to) query = query.lte('date', filters.date_to);
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`vendor.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const validSortCols: Record<string, string> = { date: 'date', amount: 'amount', amount_base: 'amount_base' };
      query = query.order(validSortCols[sortCol] ?? 'date', { ascending: sortDir === 'asc' });

      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const rows: ExpenseRow[] = (data ?? []).map((r) => {
        const prop = r.properties as { name: string; base_currency: string } | null;
        const cat = r.expense_categories as { name: string } | null;
        return {
          id: r.id,
          date: r.date,
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
          amount_base: r.amount_base,
          status: r.status as 'pending_confirmation' | 'confirmed',
          attachment_url: r.attachment_url,
          notes: r.notes,
          created_by_name: (r.creator as { full_name: string } | null)?.full_name ?? '—',
        };
      });

      return { rows, total: count ?? 0, pageSize: PAGE_SIZE };
    },
  });
}

export function usePendingExpenses(scopedPropertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['pending-expenses', scopedPropertyIds],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase.from('pending_confirmations_v').select('*');

      if (scopedPropertyIds && scopedPropertyIds.length > 0) {
        query = query.in('property_id', scopedPropertyIds);
      }

      query = query.order('days_pending', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // View columns are all nullable — guard each field
      return (data ?? [])
        .filter((r) => r.id != null)
        .map((r): PendingRow => ({
          id: r.id!,
          date: r.date ?? '',
          property_name: r.property_name ?? '—',
          room_name: r.room_name ?? null,
          category_name: r.category_name ?? '—',
          category_parent: r.category_parent ?? null,
          vendor: r.vendor,
          amount: r.amount ?? 0,
          currency: r.currency ?? 'AED',
          amount_base: r.amount_base ?? 0,
          days_pending: r.days_pending ?? 0,
        }));
    },
  });
}

export function useExpenseCategories() {
  const supabase = createClient();
  return useQuery({
    queryKey: ['expense-categories'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name, parent_id')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;

      const cats = data ?? [];
      const parentMap = new Map(cats.map((c) => [c.id, c.name]));

      return cats.map((c): ExpenseCategory => ({
        id: c.id,
        name: c.name,
        parent_id: c.parent_id,
        parent_name: c.parent_id ? (parentMap.get(c.parent_id) ?? null) : null,
      }));
    },
  });
}
