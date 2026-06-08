'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod/v3';

const propertySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().optional(),
  country_id: z.string().uuid('Invalid country'),
  base_currency: z.enum(['AED', 'INR'], { errorMap: () => ({ message: 'Invalid currency' }) }),
  is_active: z.boolean().default(true),
});

type ActionState = { error?: string; success?: boolean };

async function getSA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function createProperty(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  try {
    await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const raw = {
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    country_id: formData.get('country_id'),
    base_currency: formData.get('base_currency'),
    is_active: formData.get('is_active') === 'true',
  };

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase.from('properties').insert(parsed.data);
  if (error) return { error: 'Failed to create property.' };

  revalidatePath('/admin/properties');
  return { success: true };
}

export async function updateProperty(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  try {
    await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const raw = {
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    country_id: formData.get('country_id'),
    base_currency: formData.get('base_currency'),
    is_active: formData.get('is_active') === 'true',
  };

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { error } = await supabase
    .from('properties')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to update property.' };

  revalidatePath('/admin/properties');
  return { success: true };
}

export async function togglePropertyActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('properties')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to update property.' };
  revalidatePath('/admin/properties');
  return {};
}
