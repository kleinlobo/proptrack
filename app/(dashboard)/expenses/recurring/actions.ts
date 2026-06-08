'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod/v3';
import { createClient } from '@/lib/supabase/server';

const RECURRENCE_TYPES = ['weekly', 'monthly', 'quarterly', 'annually'] as const;
const PAYMENT_METHODS = ['bank_transfer', 'cash', 'credit_card', 'cheque', 'online_payment', 'other'] as const;

const recurringSchema = z.object({
  property_id: z.string().uuid('Please select a property'),
  room_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid('Please select a category'),
  vendor: z.string().max(200).nullable().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  recurrence_type: z.enum(RECURRENCE_TYPES),
  day_of_month: z.coerce.number().min(1).max(28).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type RecurringFormState = {
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

function calcNextDueDate(recurrenceType: string, startDate: string, dayOfMonth: number | null): string {
  const today = new Date();
  const start = new Date(startDate);
  if (start > today) return startDate;

  const dom = dayOfMonth ?? 1;
  const now = new Date();

  if (recurrenceType === 'weekly') {
    // Next occurrence from today
    const next = new Date(start);
    while (next <= now) next.setDate(next.getDate() + 7);
    return next.toISOString().split('T')[0];
  }

  // monthly / quarterly / annually — use day_of_month
  const months = recurrenceType === 'monthly' ? 1 : recurrenceType === 'quarterly' ? 3 : 12;
  const next = new Date(now.getFullYear(), now.getMonth(), dom);
  if (next <= now) next.setMonth(next.getMonth() + months);
  return next.toISOString().split('T')[0];
}

export async function createRecurringExpense(
  _prev: RecurringFormState,
  formData: FormData
): Promise<RecurringFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to create recurring expenses.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    category_id: formData.get('category_id'),
    vendor: formData.get('vendor') || null,
    payment_method: formData.get('payment_method'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    recurrence_type: formData.get('recurrence_type'),
    day_of_month: formData.get('day_of_month') || null,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || null,
    notes: formData.get('notes') || null,
  };

  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { data: d } = parsed;
  const nextDueDate = calcNextDueDate(d.recurrence_type, d.start_date, d.day_of_month ?? null);

  const { error } = await supabase.from('recurring_expenses').insert({
    property_id: d.property_id,
    room_id: d.room_id ?? null,
    category_id: d.category_id,
    vendor: d.vendor ?? null,
    payment_method: d.payment_method,
    amount: d.amount,
    currency: d.currency,
    recurrence_type: d.recurrence_type,
    day_of_month: d.day_of_month ?? null,
    start_date: d.start_date,
    end_date: d.end_date ?? null,
    next_due_date: nextDueDate,
    notes: d.notes ?? null,
    is_active: true,
    created_by: user.id,
  });

  if (error) {
    console.error('createRecurringExpense:', error.code);
    return { error: 'Could not save. Please try again.' };
  }

  revalidatePath('/expenses/recurring');
  return { success: true };
}

export async function updateRecurringExpense(
  id: string,
  _prev: RecurringFormState,
  formData: FormData
): Promise<RecurringFormState> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to edit recurring expenses.' };
  }

  const raw = {
    property_id: formData.get('property_id'),
    room_id: formData.get('room_id') || null,
    category_id: formData.get('category_id'),
    vendor: formData.get('vendor') || null,
    payment_method: formData.get('payment_method'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    recurrence_type: formData.get('recurrence_type'),
    day_of_month: formData.get('day_of_month') || null,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || null,
    notes: formData.get('notes') || null,
  };

  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { data: d } = parsed;
  const nextDueDate = calcNextDueDate(d.recurrence_type, d.start_date, d.day_of_month ?? null);

  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      property_id: d.property_id,
      room_id: d.room_id ?? null,
      category_id: d.category_id,
      vendor: d.vendor ?? null,
      payment_method: d.payment_method,
      amount: d.amount,
      currency: d.currency,
      recurrence_type: d.recurrence_type,
      day_of_month: d.day_of_month ?? null,
      start_date: d.start_date,
      end_date: d.end_date ?? null,
      next_due_date: nextDueDate,
      notes: d.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('updateRecurringExpense:', error.code);
    return { error: 'Could not update. Please try again.' };
  }

  revalidatePath('/expenses/recurring');
  return { success: true };
}

export async function toggleRecurringExpense(id: string, isActive: boolean): Promise<{ error?: string }> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (!['super_admin', 'property_manager'].includes(role)) {
    return { error: 'You do not have permission to change recurring expense status.' };
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return { error: 'Could not update status. Please try again.' };

  revalidatePath('/expenses/recurring');
  return {};
}

export async function deleteRecurringExpense(id: string): Promise<{ error?: string }> {
  const { supabase, user, role } = await getAuthorizedClient();
  if (role !== 'super_admin') {
    return { error: 'Only Super Admins can delete recurring expenses.' };
  }

  const { error } = await supabase
    .from('recurring_expenses')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) return { error: 'Could not delete. Please try again.' };

  revalidatePath('/expenses/recurring');
  return {};
}
