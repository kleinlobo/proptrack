import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Access Denied — PropTrack' };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-bg)]">
        <ShieldX className="h-8 w-8 text-[var(--color-error)]" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-neutral-900)]">Access Denied</h1>
      <p className="mb-6 max-w-sm text-sm text-[var(--color-neutral-500)]">
        You don&apos;t have permission to view this page.
      </p>
      <Button asChild className="bg-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-navy)]">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
