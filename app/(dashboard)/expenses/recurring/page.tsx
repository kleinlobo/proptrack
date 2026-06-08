import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RecurringPageContent } from './_components/RecurringPageContent';

export const metadata = { title: 'Recurring Expenses — PropTrack' };

export default async function RecurringExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role ?? 'read_only') as 'super_admin' | 'property_manager' | 'read_only';

  let scopedPropertyIds: string[] | null = null;
  if (role !== 'super_admin') {
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    scopedPropertyIds = (assignments ?? []).map((a) => a.property_id);
  }

  return (
    <div className="px-6 py-6 max-w-screen-xl mx-auto">
      <RecurringPageContent role={role} scopedPropertyIds={scopedPropertyIds} />
    </div>
  );
}
