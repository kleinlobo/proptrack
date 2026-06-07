'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type SetPasswordState = {
  error?: string;
  tokenExpired?: boolean;
};

export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const strongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!strongPassword.test(password)) {
    return {
      error: 'Password must be at least 8 characters with one uppercase letter and one number.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.message.toLowerCase().includes('expired') || error.status === 401) {
      return { tokenExpired: true, error: 'This link has expired or is invalid. Request a new one.' };
    }
    return { error: 'Could not set password. Please try again.' };
  }

  redirect('/dashboard');
}
