import { SetPasswordForm } from './_components/set-password-form';

export const metadata = { title: 'Set Password — PropTrack' };

export default function SetPasswordPage() {
  return (
    <div className="rounded-xl bg-[var(--color-white)] p-8 shadow-sm ring-1 ring-[var(--color-neutral-300)]/50">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight text-[var(--color-brand-navy)]">
          Prop<span className="text-[var(--color-brand-blue)]">Track</span>
        </span>
        <p className="mt-1 text-sm text-[var(--color-neutral-500)]">Set your new password</p>
      </div>
      <SetPasswordForm />
    </div>
  );
}
