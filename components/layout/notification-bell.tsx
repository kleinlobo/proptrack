'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import { cn } from '@/lib/utils';

type Notification = Tables<'notifications'>;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const NAV_TARGETS: Record<string, string> = {
  recurring_due: '/expenses?tab=pending',
  recurring_overdue: '/expenses?tab=pending',
  missing_income: '/income',
  large_expense: '/expenses',
  report_ready: '/reports/history',
};

async function fetchNotifications(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

async function fetchUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .is('deleted_at', null);
  return count ?? 0;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: () => fetchUnreadCount(userId),
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId),
    enabled: open,
  });

  // Supabase Realtime subscription for live notification updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, supabase]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function markRead(notification: Notification) {
    setOpen(false);
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    }
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-700)]"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-error)] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-[var(--color-neutral-300)] bg-[var(--color-white)] shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-neutral-300)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[var(--color-brand-blue)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-[var(--color-neutral-300)]" />
                <p className="text-sm text-[var(--color-neutral-500)]">
                  You&apos;re all caught up! No notifications yet.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={NAV_TARGETS[n.type] ?? '/notifications'}
                  onClick={() => markRead(n)}
                  className={cn(
                    'flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-neutral-50)]',
                    !n.is_read && 'border-l-2 border-[var(--color-brand-blue)] bg-[var(--color-brand-blue-lt)]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !n.is_read ? 'font-semibold text-[var(--color-neutral-900)]' : 'text-[var(--color-neutral-700)]')}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-neutral-500)]">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-neutral-300)] px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-[var(--color-brand-blue)] hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
