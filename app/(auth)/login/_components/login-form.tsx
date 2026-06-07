'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { loginAction, type LoginState } from '../actions';
import { Button } from '@/components/ui/button';

const initialState: LoginState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('reason') === 'expired';
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) {
      errorRef.current?.focus();
    }
  }, [state.error]);

  return (
    <form action={formAction} noValidate className="space-y-5">
      {isExpired && (
        <div
          role="status"
          className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]"
        >
          Your session has expired. Please log in again.
        </div>
      )}

      {state.error && (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-[var(--color-error)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error)]"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-neutral-700)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-[var(--color-neutral-300)] bg-[var(--color-white)] px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 disabled:opacity-50"
          placeholder="you@example.com"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--color-neutral-700)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-[var(--color-neutral-300)] bg-[var(--color-white)] px-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-brand-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]/20 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--color-brand-blue)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-navy)] disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Log In'
        )}
      </Button>
    </form>
  );
}
