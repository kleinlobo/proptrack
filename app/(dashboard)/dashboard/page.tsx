import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from './_components/DashboardContent';
import type { FYSettings } from '@/lib/date-utils';

export const metadata = { title: 'Dashboard — PropTrack' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const role = profile.role as 'super_admin' | 'property_manager' | 'read_only';

  // Get scoped property IDs for non-SA users
  let propertyIds: string[] | null = null;
  if (role !== 'super_admin') {
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    propertyIds = (assignments ?? []).map((a) => a.property_id);
  }

  // Get financial year settings
  const { data: fyRow } = await supabase
    .from('financial_year_settings')
    .select('start_month, start_day')
    .eq('is_active', true)
    .single();

  const fySettings: FYSettings | undefined = fyRow
    ? { start_month: fyRow.start_month, start_day: fyRow.start_day }
    : undefined;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-neutral-900)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-neutral-500)] mt-1">Financial overview</p>
      </div>

      <Suspense>
        <DashboardContent role={role} propertyIds={propertyIds} fySettings={fySettings} />
      </Suspense>
    </div>
  );
}
