'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type LoginState = {
  error?: string;
  locked?: boolean;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes('locked') || error.status === 429) {
      return { locked: true, error: 'Account locked for 15 minutes due to too many failed attempts.' };
    }
    return { error: 'Incorrect email or password.' };
  }

  redirect('/dashboard');
}
