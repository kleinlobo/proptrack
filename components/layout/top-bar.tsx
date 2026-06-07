'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, ChevronDown, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/app-store';
import { NotificationBell } from './notification-bell';
import type { Tables } from '@/types/database.types';

type UserProfile = Tables<'user_profiles'>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function TopBar({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-neutral-300)] bg-[var(--color-white)] px-4">
      {/* Left: mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-700)] lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Right: notifications + user */}
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell userId={user.id} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-neutral-100)]"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-blue-lt)] text-xs font-semibold text-[var(--color-brand-blue)]">
              {getInitials(user.full_name)}
            </div>
            <span className="hidden max-w-32 truncate text-sm font-medium text-[var(--color-neutral-700)] sm:block">
              {user.full_name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-neutral-500)]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-[var(--color-neutral-300)] bg-[var(--color-white)] shadow-lg">
              <div className="border-b border-[var(--color-neutral-300)] px-4 py-3">
                <p className="truncate text-sm font-medium text-[var(--color-neutral-900)]">
                  {user.full_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-neutral-500)]">
                  {user.role === 'super_admin'
                    ? 'Super Admin'
                    : user.role === 'property_manager'
                      ? 'Property Manager'
                      : 'Read Only'}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
