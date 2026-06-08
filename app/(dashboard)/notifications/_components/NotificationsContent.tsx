'use client';

import { useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  expense_pending: '💰',
  report_ready: '📊',
  income_added: '✅',
  system: '🔔',
};

interface Props { userId: string; }

export default function NotificationsContent({ userId }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, is_read, created_at, related_entity_type, related_entity_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    staleTime: 15_000,
  });

  function markAllRead() {
    startTransition(async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    });
  }

  function markRead(id: string) {
    startTransition(async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    });
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">{unreadCount} unread</span>
          <button
            onClick={markAllRead}
            disabled={isPending}
            className="text-xs text-[#276EAC] hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>
      )}

      {(notifications ?? []).length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-2xl mb-2">🔔</p>
          <p className="text-sm text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(notifications ?? []).map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id); }}
              className={[
                'bg-white border rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors',
                n.is_read ? 'border-gray-200' : 'border-[#276EAC]/30 shadow-sm',
              ].join(' ')}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#276EAC] flex-shrink-0" />
                  )}
                </div>
                {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
