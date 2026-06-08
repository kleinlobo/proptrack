'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface IncomeFilters {
  search?: string;
  property_ids?: string[];
  room_ids?: string[];
  sources?: string[];
  currencies?: string[];
  date_from?: string;
  date_to?: string;
}

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
  created_by_name: string;
  status: string;
}

export function useIncomeList(
  filters: IncomeFilters,
  page: number,
  sortCol: string,
  sortDir: 'asc' | 'desc',
  scopedPropertyIds: string[] | null
) {
  const supabase = createClient();
  const PAGE_SIZE = 50;

  return useQuery({
    queryKey: ['income-list', filters, page, sortCol, sortDir, scopedPropertyIds],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('income_records')
        .select(
          `id, date, property_id, income_source, amount, currency, amount_base, notes, status,
           properties(name, base_currency),
           rooms(name),
           creator:user_profiles!income_records_created_by_fkey(full_name)`,
          { count: 'exact' }
        )
        .is('deleted_at', null);

      // Scope by role
      if (scopedPropertyIds && scopedPropertyIds.length > 0) {
        query = query.in('property_id', scopedPropertyIds);
      }

      // Filters
      if (filters.property_ids?.length) {
        query = query.in('property_id', filters.property_ids);
      }
      if (filters.sources?.length) {
        query = query.in('income_source', filters.sources);
      }
      if (filters.currencies?.length) {
        query = query.in('currency', filters.currencies);
      }
      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }
      if (filters.search) {
        query = query.or(
          `notes.ilike.%${filters.search}%`
        );
      }

      // Sort
      const validSortCols: Record<string, string> = { date: 'date', amount: 'amount', amount_base: 'amount_base' };
      const orderCol = validSortCols[sortCol] ?? 'date';
      query = query.order(orderCol, { ascending: sortDir === 'asc' });

      // Pagination
      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const rows: IncomeRow[] = (data ?? []).map((r) => {
        const prop = r.properties as { name: string; base_currency: string } | null;
        return {
          id: r.id,
          date: r.date,
          property_id: r.property_id,
          property_name: prop?.name ?? '—',
          base_currency: prop?.base_currency ?? r.currency,
          room_name: (r.rooms as { name: string } | null)?.name ?? null,
          income_source: r.income_source,
          amount: r.amount,
          currency: r.currency,
          amount_base: r.amount_base,
          notes: r.notes,
          created_by_name: (r.creator as { full_name: string } | null)?.full_name ?? '—',
          status: r.status,
        };
      });

      return { rows, total: count ?? 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useIncomeRecord(id: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['income-record', id],
    enabled: !!id,
    staleTime: 0,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('income_records')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useScopedProperties(scopedPropertyIds: string[] | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['scoped-properties', scopedPropertyIds],
    staleTime: 300_000,
    queryFn: async () => {
      let q = supabase
        .from('properties')
        .select('id, name, base_currency')
        .eq('is_active', true)
        .order('name');
      if (scopedPropertyIds) {
        q = q.in('id', scopedPropertyIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRoomsForProperty(propertyId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ['rooms-for-property', propertyId],
    enabled: !!propertyId,
    staleTime: 300_000,
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
