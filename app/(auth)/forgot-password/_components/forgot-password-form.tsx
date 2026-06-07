'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { forgotPasswordAction, type ForgotPasswordState } from '../actions';
import { Button } from '@/components/ui/button';

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
        </div>
        <div>
          <p className="text-sm text-[var(--color-neutral-700)]">
            If that email is registered, a reset link has been sent.
          </p>
          <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
            Check your inbox and follow the link in the email.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-sm text-[var(--color-brand-blue)] hover:underline"
        >
          ← Back to Login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
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
        {state.fieldError && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {state.fieldError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-navy)] disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Send Reset Link'
        )}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-[var(--color-brand-blue)] hover:underline">
          ← Back to Login
        </Link>
      </div>
    </form>
  );
}
