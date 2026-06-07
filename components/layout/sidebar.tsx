'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  RefreshCw,
  FileBarChart,
  Building2,
  Users,
  Settings,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';

type Role = 'super_admin' | 'property_manager' | 'read_only';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: () => number | null;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Income', href: '/income', icon: TrendingUp },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Recurring', href: '/expenses/recurring', icon: RefreshCw },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Properties', href: '/properties', icon: Building2, adminOnly: true },
  { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--color-brand-blue-lt)] text-[var(--color-brand-blue)]'
          : 'text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
    </Link>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === 'super_admin'
  );

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[var(--color-neutral-300)] bg-[var(--color-white)] transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/dashboard">
            <span className="text-xl font-bold tracking-tight text-[var(--color-brand-navy)]">
              Prop<span className="text-[var(--color-brand-blue)]">Track</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </nav>

        {/* Role badge at bottom */}
        <div className="shrink-0 border-t border-[var(--color-neutral-300)] px-5 py-4">
          <p className="text-xs text-[var(--color-neutral-500)]">
            {role === 'super_admin'
              ? 'Super Admin'
              : role === 'property_manager'
                ? 'Property Manager'
                : 'Read Only'}
          </p>
        </div>
      </aside>
    </>
  );
}
