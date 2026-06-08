'use client';

import { Search, X } from 'lucide-react';

interface Property {
  id: string;
  name: string;
}

interface FilterState {
  search: string;
  property_ids: string[];
  sources: string[];
  currencies: string[];
  date_from: string;
  date_to: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  properties: Property[];
}

const SOURCE_OPTIONS = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'direct_booking', label: 'Direct' },
  { value: 'cash', label: 'Cash' },
  { value: 'monthly_rental', label: 'Monthly Rental' },
  { value: 'other', label: 'Other' },
];

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-[#276EAC] border-[#276EAC] text-white'
          : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-[var(--color-neutral-600)] hover:border-[#276EAC] hover:text-[#276EAC]'
      }`}
    >
      {label}
    </button>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export function FilterPanel({ filters, onChange, properties }: Props) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.property_ids.length > 0 ||
    filters.sources.length > 0 ||
    filters.currencies.length > 0 ||
    filters.date_from !== '' ||
    filters.date_to !== '';

  function clear() {
    onChange({ search: '', property_ids: [], sources: [], currencies: [], date_from: '', date_to: '' });
  }

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-4 py-4 space-y-3">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search notes…"
            className="w-full h-9 pl-9 pr-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:border-[#276EAC] transition-colors"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
            aria-label="From date"
            className="h-9 px-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs text-[var(--color-neutral-700)] focus:outline-none focus:border-[#276EAC] transition-colors"
          />
          <span className="text-xs text-[var(--color-neutral-400)]">–</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
            aria-label="To date"
            className="h-9 px-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs text-[var(--color-neutral-700)] focus:outline-none focus:border-[#276EAC] transition-colors"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-xs text-[var(--color-neutral-500)] hover:text-[var(--color-error)] transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Property pills */}
        {properties.length > 1 && properties.map((p) => (
          <Pill
            key={p.id}
            label={p.name}
            active={filters.property_ids.includes(p.id)}
            onClick={() => onChange({ ...filters, property_ids: toggle(filters.property_ids, p.id) })}
          />
        ))}

        {/* Divider if both groups */}
        {properties.length > 1 && <span className="w-px h-5 bg-neutral-200 mx-1" aria-hidden="true" />}

        {/* Source pills */}
        {SOURCE_OPTIONS.map((s) => (
          <Pill
            key={s.value}
            label={s.label}
            active={filters.sources.includes(s.value)}
            onClick={() => onChange({ ...filters, sources: toggle(filters.sources, s.value) })}
          />
        ))}

        <span className="w-px h-5 bg-neutral-200 mx-1" aria-hidden="true" />

        {/* Currency pills */}
        {(['AED', 'INR'] as const).map((c) => (
          <Pill
            key={c}
            label={c}
            active={filters.currencies.includes(c)}
            onClick={() => onChange({ ...filters, currencies: toggle(filters.currencies, c) })}
          />
        ))}
      </div>
    </div>
  );
}

export type { FilterState };
