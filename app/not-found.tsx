import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-5xl font-bold text-[var(--color-neutral-300)]">404</p>
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-neutral-900)]">Page Not Found</h1>
      <p className="mb-6 max-w-sm text-sm text-[var(--color-neutral-500)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild className="bg-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-navy)]">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
