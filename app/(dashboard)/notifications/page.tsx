import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NotificationsContent from './_components/NotificationsContent';

export const metadata = { title: 'Notifications — PropTrack' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Stay up to date with activity across your properties.</p>
      </div>
      <NotificationsContent userId={user.id} />
    </div>
  );
}
