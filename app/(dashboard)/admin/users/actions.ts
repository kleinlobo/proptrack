'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod/v3';

type ActionState = { error?: string; success?: boolean };

async function getSA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') throw new Error('Unauthorized');
  return user;
}

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  full_name: z.string().min(2, 'Name too short'),
  role: z.enum(['super_admin', 'property_manager', 'read_only']),
});

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  try {
    await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Invite user via Supabase Auth Admin API
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proptrack-six.vercel.app';
  const { data: inviteData, error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name, role: parsed.data.role },
      redirectTo: `${appUrl}/auth/confirm`,
    }
  );

  if (inviteErr) {
    console.error('inviteUser error:', inviteErr.message);
    return { error: inviteErr.message.includes('already') ? 'A user with this email already exists.' : 'Failed to send invitation.' };
  }

  // Create/upsert user_profiles row
  if (inviteData.user) {
    await supabase.from('user_profiles').upsert({
      id: inviteData.user.id,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      is_active: true,
    }, { onConflict: 'id' });
  }

  revalidatePath('/admin/users');
  return { success: true };
}

const updateUserSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(['super_admin', 'property_manager', 'read_only']),
  is_active: z.boolean(),
});

export async function updateUser(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  try {
    await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const parsed = updateUserSchema.safeParse({
    full_name: formData.get('full_name'),
    role: formData.get('role'),
    is_active: formData.get('is_active') === 'true',
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: 'Failed to update user.' };

  // Sync property assignments if deactivated
  if (!parsed.data.is_active) {
    await supabase
      .from('property_assignments')
      .update({ deleted_at: new Date().toISOString(), deleted_by: id })
      .eq('user_id', id)
      .is('deleted_at', null);
  }

  revalidatePath('/admin/users');
  return { success: true };
}

const assignSchema = z.object({
  user_id: z.string().uuid(),
  property_id: z.string().uuid(),
});

export async function assignProperty(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  let saUser;
  try {
    saUser = await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const parsed = assignSchema.safeParse({
    user_id: formData.get('user_id'),
    property_id: formData.get('property_id'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Check not already assigned
  const { data: existing } = await supabase
    .from('property_assignments')
    .select('id')
    .eq('user_id', parsed.data.user_id)
    .eq('property_id', parsed.data.property_id)
    .is('deleted_at', null)
    .single();

  if (existing) return { error: 'User is already assigned to this property.' };

  const { error } = await supabase.from('property_assignments').insert({
    user_id: parsed.data.user_id,
    property_id: parsed.data.property_id,
    assigned_by: saUser.id,
  });

  if (error) return { error: 'Failed to assign property.' };
  revalidatePath('/admin/users');
  return { success: true };
}

export async function removePropertyAssignment(assignmentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  let saUser;
  try {
    saUser = await getSA(supabase);
  } catch {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('property_assignments')
    .update({ deleted_at: new Date().toISOString(), deleted_by: saUser.id })
    .eq('id', assignmentId);

  if (error) return { error: 'Failed to remove assignment.' };
  revalidatePath('/admin/users');
  return {};
}
