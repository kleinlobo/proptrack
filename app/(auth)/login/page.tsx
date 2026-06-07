import { Suspense } from 'react';
import { LoginForm } from './_components/login-form';

export const metadata = { title: 'Log In — PropTrack' };

export default function LoginPage() {
  return (
    <div className="rounded-xl bg-[var(--color-white)] p-8 shadow-sm ring-1 ring-[var(--color-neutral-300)]/50">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-[var(--color-brand-navy)]">
          Prop<span className="text-[var(--color-brand-blue)]">Track</span>
        </span>
        <p className="mt-1 text-sm text-[var(--color-neutral-500)]">Sign in to your account</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
