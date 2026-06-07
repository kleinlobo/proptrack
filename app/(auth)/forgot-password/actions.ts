'use server';

import { createClient } from '@/lib/supabase/server';

export type ForgotPasswordState = {
  success?: boolean;
  fieldError?: string;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldError: 'Please enter a valid email address.' };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Always return success even if email doesn't exist — prevents user enumeration
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/set-password`,
  });

  return { success: true };
}
