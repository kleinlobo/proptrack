'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { TrendingUp, Receipt, TrendingDown, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { KPICard, KPICardSkeleton } from '@/components/charts/KPICard';
import { PeriodSelector } from './PeriodSelector';
import { RevenueExpensesChart } from '@/components/charts/RevenueExpensesChart';
import { ProfitTrendChart } from '@/components/charts/ProfitTrendChart';
import { ExpenseBreakdownChart } from '@/components/charts/ExpenseBreakdownChart';
import { PropertyPerformanceChart } from '@/components/charts/PropertyPerformanceChart';
import { RecentActivity } from '@/components/charts/RecentActivity';
import {
  useRevenueTotals,
  useExpenseTotals,
  usePendingCount,
} from '@/hooks/use-dashboard';
import { formatCurrency } from '@/lib/currency/format';
import { parsePeriod, getPeriodRange, type FYSettings } from '@/lib/date-utils';

interface Props {
  role: 'super_admin' | 'property_manager' | 'read_only';
  propertyIds: string[] | null;
  fySettings?: FYSettings;
}

const AED_COLOR = '#276EAC';
const INR_COLOR = '#059669';

function formatKPIValue(aed: number, inr: number): {
  primary: string;
  primaryColor: string;
  secondary?: string;
  secondaryColor?: string;
} {
  const hasAED = aed !== 0;
  const hasINR = inr !== 0;

  if (hasAED && hasINR) {
    return {
      primary: formatCurrency(aed, 'AED'),
      primaryColor: AED_COLOR,
      secondary: formatCurrency(inr, 'INR'),
      secondaryColor: INR_COLOR,
    };
  }
  if (hasINR) {
    return { primary: formatCurrency(inr, 'INR'), primaryColor: INR_COLOR };
  }
  return {
    primary: formatCurrency(aed, 'AED'),
    primaryColor: AED_COLOR,
  };
}

export function DashboardContent({ role, propertyIds, fySettings }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const period = parsePeriod(searchParams.get('period'));
  const range = getPeriodRange(period, fySettings);

  const { data: revenue, isLoading: revLoading } = useRevenueTotals(range, propertyIds);
  const { data: expenses, isLoading: expLoading } = useExpenseTotals(range, propertyIds);
  const { data: pendingCount, isLoading: pendingLoading } = usePendingCount(propertyIds);

  const netAED = (revenue?.aed ?? 0) - (expenses?.aed ?? 0);
  const netINR = (revenue?.inr ?? 0) - (expenses?.inr ?? 0);
  const isProfitPositive = netAED >= 0 && netINR >= 0;

  const revenueKPI = formatKPIValue(revenue?.aed ?? 0, revenue?.inr ?? 0);
  const expenseKPI = formatKPIValue(expenses?.aed ?? 0, expenses?.inr ?? 0);
  const profitKPI = formatKPIValue(netAED, netINR);

  const isSA = role === 'super_admin';

  return (
    <div>
      {/* Period selector + PM quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <PeriodSelector activePeriod={period} />
        {role === 'property_manager' && (
          <div className="flex items-center gap-3">
            <Link
              href="/income?action=add"
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-[var(--color-brand-blue)] hover:bg-[#1E5C91] text-white font-semibold text-sm rounded transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Income
            </Link>
            <Link
              href="/expenses?action=add"
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-white hover:bg-neutral-50 text-[var(--color-neutral-700)] font-medium text-sm rounded border border-[var(--color-neutral-300)] hover:border-neutral-400 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Expense
            </Link>
          </div>
        )}
      </div>

      {/* Pending confirmation banner for PM */}
      {role === 'property_manager' && (pendingCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-6 bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-sm font-medium">
            You have {pendingCount} recurring expense{pendingCount !== 1 ? 's' : ''} awaiting
            confirmation.{' '}
            <Link href="/expenses?tab=pending" className="underline font-semibold">
              Review now →
            </Link>
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {revLoading ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Total Revenue"
            primaryValue={revenueKPI.primary}
            primaryColor={revenueKPI.primaryColor}
            secondaryValue={revenueKPI.secondary}
            secondaryColor={revenueKPI.secondaryColor}
            accentColor="#276EAC"
            iconBg="bg-blue-50"
            iconColor="text-[#276EAC]"
            Icon={TrendingUp}
          />
        )}

        {expLoading ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Total Expenses"
            primaryValue={expenseKPI.primary}
            primaryColor={expenseKPI.primaryColor}
            secondaryValue={expenseKPI.secondary}
            secondaryColor={expenseKPI.secondaryColor}
            accentColor="#B45A00"
            iconBg="bg-amber-50"
            iconColor="text-amber-700"
            Icon={Receipt}
          />
        )}

        {revLoading || expLoading ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Net Profit"
            primaryValue={profitKPI.primary}
            primaryColor={profitKPI.primaryColor}
            secondaryValue={profitKPI.secondary}
            secondaryColor={profitKPI.secondaryColor}
            accentColor={isProfitPositive ? '#146B3A' : '#9B1C1C'}
            iconBg={isProfitPositive ? 'bg-emerald-50' : 'bg-red-50'}
            iconColor={isProfitPositive ? 'text-emerald-700' : 'text-red-700'}
            Icon={isProfitPositive ? TrendingUp : TrendingDown}
          />
        )}

        {pendingLoading ? (
          <KPICardSkeleton />
        ) : (
          <KPICard
            title="Pending Items"
            primaryValue={String(pendingCount ?? 0)}
            accentColor="#5B21B6"
            iconBg="bg-violet-50"
            iconColor="text-violet-700"
            Icon={AlertCircle}
            onClick={() => router.push('/expenses?tab=pending')}
          />
        )}
      </div>

      {/* Main content: charts + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts 2/3 width */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueExpensesChart propertyIds={propertyIds} />
            <ProfitTrendChart propertyIds={propertyIds} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseBreakdownChart range={range} propertyIds={propertyIds} />
            {isSA && <PropertyPerformanceChart />}
          </div>
        </div>

        {/* Recent activity 1/3 width */}
        <div className="lg:col-span-1">
          <RecentActivity propertyIds={propertyIds} role={role} />
        </div>
      </div>
    </div>
  );
}
