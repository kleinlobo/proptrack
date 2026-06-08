import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UsersPageContent from './_components/UsersPageContent';

export const metadata = { title: 'Users — PropTrack Admin' };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <UsersPageContent properties={properties ?? []} />
    </div>
  );
}
