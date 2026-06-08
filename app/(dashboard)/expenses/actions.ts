'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod/v3';
import { createClient } from '@/lib/supabase/server';
import { convertToBase } from '@/lib/currency/convert';
import type { Currency } from '@/lib/currency/format';

const PAYMENT_METHODS = ['bank_transfer', 'cash', 'credit_card', 'cheque', 'online_payment', 'other'] as const;

const expenseSchema = z.object({
  property_id: z.string().uuid('Please select a property'),
  room_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid('Please select a category'),
  vendor: z.string().max(200).nullable().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  status: z.enum(['pending_confirmation', 'confirmed']).default('confirmed'),
  attachment_url: z.string().nullable().optional(),
  attachment_name: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type ExpenseFormState = {
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

export async function createExpenseRecord(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to add expense records.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    category_id: formData.get('category_id'),
    vendor: formData.get('vendor') || null,
    payment_method: formData.get('payment_method'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    status: formData.get('status') || 'confirmed',
    attachment_url: formData.get('attachment_url') || null,
    attachment_name: formData.get('attachment_name') || null,
    notes: formData.get('notes') || null,
  };

  const parsed = expenseSchema.safeParse(raw);
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

  const { error } = await supabase.from('expense_records').insert({
    property_id: d.property_id,
    room_id: d.room_id ?? null,
    category_id: d.category_id,
    vendor: d.vendor ?? null,
    payment_method: d.payment_method,
    date: d.date,
    amount: d.amount,
    currency: d.currency,
    amount_base: amountBase,
    exchange_rate_used: exchangeRateUsed,
    status: d.status,
    attachment_url: d.attachment_url ?? null,
    attachment_name: d.attachment_name ?? null,
    notes: d.notes ?? null,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error('createExpenseRecord:', error.code);
    return { error: 'Could not save record. Please try again.' };
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateExpenseRecord(
  id: string,
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to edit expense records.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    category_id: formData.get('category_id'),
    vendor: formData.get('vendor') || null,
    payment_method: formData.get('payment_method'),
    date: formData.get('date'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    status: formData.get('status') || 'confirmed',
    attachment_url: formData.get('attachment_url') || null,
    attachment_name: formData.get('attachment_name') || null,
    notes: formData.get('notes') || null,
  };

  const parsed = expenseSchema.safeParse(raw);
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
    .from('expense_records')
    .update({
      property_id: d.property_id,
      room_id: d.room_id ?? null,
      category_id: d.category_id,
      vendor: d.vendor ?? null,
      payment_method: d.payment_method,
      date: d.date,
      amount: d.amount,
      currency: d.currency,
      amount_base: amountBase,
      exchange_rate_used: exchangeRateUsed,
      status: d.status,
      attachment_url: d.attachment_url ?? null,
      attachment_name: d.attachment_name ?? null,
      notes: d.notes ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('updateExpenseRecord:', error.code);
    return { error: 'Could not update record. Please try again.' };
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function confirmExpenseRecord(id: string): Promise<{ error?: string }> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to confirm expense records.' };
  }

  const { error } = await supabase
    .from('expense_records')
    .update({ status: 'confirmed', updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('confirmExpenseRecord:', error.code);
    return { error: 'Could not confirm record. Please try again.' };
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return {};
}

export async function deleteExpenseRecord(id: string): Promise<{ error?: string }> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (role !== 'super_admin') {
    return { error: 'Only Super Admins can delete expense records.' };
  }

  const { error } = await supabase
    .from('expense_records')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('deleteExpenseRecord:', error.code);
    return { error: 'Could not delete record. Please try again.' };
  }

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return {};
}
