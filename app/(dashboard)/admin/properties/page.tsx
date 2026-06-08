import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PropertiesPageContent from './_components/PropertiesPageContent';

export const metadata = { title: 'Properties — PropTrack Admin' };

export default async function AdminPropertiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, base_currency')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <PropertiesPageContent countries={countries ?? []} />
    </div>
  );
}
