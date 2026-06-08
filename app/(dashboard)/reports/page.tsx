import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportBuilder from './_components/ReportBuilder';
import ReportHistory from './_components/ReportHistory';

export const metadata = { title: 'Reports — PropTrack' };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string;
  if (!['super_admin', 'property_manager'].includes(role)) {
    redirect('/dashboard');
  }

  // Scoped properties
  let propertyIds: string[] | null = null;
  if (role !== 'super_admin') {
    const { data: assignments } = await supabase
      .from('property_assignments')
      .select('property_id')
      .eq('user_id', user.id)
      .is('deleted_at', null);
    propertyIds = (assignments ?? []).map((a) => a.property_id);
  }

  let propQuery = supabase
    .from('properties')
    .select('id, name, base_currency')
    .eq('is_active', true)
    .order('name');

  if (propertyIds !== null) {
    propQuery = propQuery.in('id', propertyIds);
  }

  const { data: properties } = await propQuery;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate financial reports as PDF or Excel.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <ReportBuilder
            properties={properties ?? []}
          />
        </div>
        <div className="lg:col-span-3">
          <ReportHistory role={role} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
