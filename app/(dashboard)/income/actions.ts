'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod/v3';
import { createClient } from '@/lib/supabase/server';
import { convertToBase } from '@/lib/currency/convert';
import type { Currency } from '@/lib/currency/format';

const incomeSchema = z.object({
  property_id: z.string().uuid('Please select a property'),
  room_id: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  income_source: z.enum(['airbnb', 'booking_com', 'direct_booking', 'cash', 'monthly_rental', 'other']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  notes: z.string().max(500).nullable().optional(),
});

export type IncomeFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

async function getAuthorizedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { supabase, user, role: profile?.role as string };
}

export async function createIncomeRecord(
  _prev: IncomeFormState,
  formData: FormData
): Promise<IncomeFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to add income records.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    date: formData.get('date'),
    income_source: formData.get('income_source'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    notes: formData.get('notes') || null,
  };

  const parsed = incomeSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { data: d } = parsed;

  // Get property base currency for conversion
  const { data: prop } = await supabase
    .from('properties')
    .select('base_currency')
    .eq('id', d.property_id)
    .single();

  if (!prop) return { error: 'Property not found.' };

  let amountBase = d.amount;
  let exchangeRateUsed = 1;

  try {
    if (d.currency !== prop.base_currency) {
      const result = await convertToBase(d.amount, d.currency as Currency, prop.base_currency as Currency);
      amountBase = result.amountBase;
      exchangeRateUsed = result.exchangeRateUsed;
    }
  } catch {
    // Use 1:1 if no exchange rate found — flag in notes
    amountBase = d.amount;
    exchangeRateUsed = 1;
  }

  const { error } = await supabase.from('income_records').insert({
    property_id: d.property_id,
    room_id: d.room_id ?? null,
    date: d.date,
    income_source: d.income_source,
    amount: d.amount,
    currency: d.currency,
    amount_base: amountBase,
    exchange_rate_used: exchangeRateUsed,
    notes: d.notes ?? null,
    status: 'confirmed',
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error('createIncomeRecord:', error.code);
    return { error: 'Could not save record. Please try again.' };
  }

  revalidatePath('/income');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateIncomeRecord(
  id: string,
  _prev: IncomeFormState,
  formData: FormData
): Promise<IncomeFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to edit income records.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    date: formData.get('date'),
    income_source: formData.get('income_source'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    notes: formData.get('notes') || null,
  };

  const parsed = incomeSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { data: d } = parsed;

  const { data: prop } = await supabase
    .from('properties')
    .select('base_currency')
    .eq('id', d.property_id)
    .single();

  if (!prop) return { error: 'Property not found.' };

  let amountBase = d.amount;
  let exchangeRateUsed = 1;
  try {
    if (d.currency !== prop.base_currency) {
      const result = await convertToBase(d.amount, d.currency as Currency, prop.base_currency as Currency);
      amountBase = result.amountBase;
      exchangeRateUsed = result.exchangeRateUsed;
    }
  } catch {
    amountBase = d.amount;
    exchangeRateUsed = 1;
  }

  const { error } = await supabase
    .from('income_records')
    .update({
      property_id: d.property_id,
      room_id: d.room_id ?? null,
      date: d.date,
      income_source: d.income_source,
      amount: d.amount,
      currency: d.currency,
      amount_base: amountBase,
      exchange_rate_used: exchangeRateUsed,
      notes: d.notes ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('updateIncomeRecord:', error.code);
    return { error: 'Could not update record. Please try again.' };
  }

  revalidatePath('/income');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteIncomeRecord(id: string): Promise<{ error?: string }> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (role !== 'super_admin') {
    return { error: 'Only Super Admins can delete income records.' };
  }

  const { error } = await supabase
    .from('income_records')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('deleteIncomeRecord:', error.code);
    return { error: 'Could not delete record. Please try again.' };
  }

  revalidatePath('/income');
  revalidatePath('/dashboard');
  return {};
}
