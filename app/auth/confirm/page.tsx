'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function processToken() {
      // Hash-based implicit flow: #access_token=xxx&refresh_token=yyy&type=invite|recovery
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // PKCE flow: ?code=xxx
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          router.replace('/login?error=link_expired');
          return;
        }
        // Invite and password-recovery both need the user to set a password
        if (type === 'invite' || type === 'recovery' || type === 'magiclink') {
          router.replace('/set-password');
        } else {
          router.replace('/dashboard');
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=link_expired');
          return;
        }
        router.replace('/set-password');
      } else {
        router.replace('/login');
      }
    }

    processToken();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-neutral-50)]">
      <div className="text-center space-y-4">
        <span className="text-2xl font-bold tracking-tight text-[var(--color-brand-navy)]">
          Prop<span className="text-[var(--color-brand-blue)]">Track</span>
        </span>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-[var(--color-brand-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-[var(--color-neutral-500)]">Setting up your account…</p>
      </div>
    </div>
  );
}
