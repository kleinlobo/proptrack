import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExchangeRateSettings from './_components/ExchangeRateSettings';

export const metadata = { title: 'Settings — PropTrack Admin' };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  const { data: rates } = await supabase
    .from('exchange_rates')
    .select('id, from_currency, to_currency, rate, effective_date, is_manual, source')
    .order('effective_date', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">System configuration for PropTrack.</p>
      </div>

      <ExchangeRateSettings rates={rates ?? []} userId={user.id} />
    </div>
  );
}
