'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { setPasswordAction, type SetPasswordState } from '../actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const initialState: SetPasswordState = {};

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    password.length >= 12,
  ];
  const score = checks.filter(Boolean).length;

  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const color = ['', 'bg-[var(--color-error)]', 'bg-[var(--color-warning)]', 'bg-[var(--color-brand-blue)]', 'bg-[var(--color-success)]'][score];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? color : 'bg-[var(--color-neutral-200)]')}
          />
        ))}
      </div>
      <p className={cn('text-xs', score >= 3 ? 'text-[var(--color-success)]' : 'text-[var(--color-neutral-500)]')}>
        {label}
      </p>
    </div>
  );
}

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(setPasswordAction, initialState);
  const [password, setPassword] = useState('');

  if (state.tokenExpired) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]">
          {state.error}
        </div>
        <Link href="/forgot-password" className="block text-sm text-[var(--color-brand-blue)] hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.error && !state.tokenExpired && (
        <div
          role="alert"
          className="rounded-md border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-neutral-700)]">
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--color-neutral-300)] bg-[var(--color-white)] px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 disabled:opacity-50"
          placeholder="Min. 8 chars, one uppercase, one number"
          disabled={isPending}
        />
        <PasswordStrengthBar password={password} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-neutral-700)]">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-[var(--color-neutral-300)] bg-[var(--color-white)] px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-navy)] disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting password…
          </>
        ) : (
          'Set Password'
        )}
      </Button>
    </form>
  );
}
