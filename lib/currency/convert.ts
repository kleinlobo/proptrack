import { createClient } from '@/lib/supabase/server';

export type Currency = 'AED' | 'INR';

/**
 * Fetch the most recent exchange rate for a currency pair on or before today.
 * Always queries the most recent rate ≤ today — never assumes today's rate exists.
 */
export async function getExchangeRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1;

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No exchange rate found for ${from} → ${to} on or before ${today}`);
  }

  return data.rate;
}

/**
 * Convert an amount from one currency to a property's base currency.
 * Returns both the converted amount (rounded to 2dp) and the rate used.
 */
export async function convertToBase(
  amount: number,
  fromCurrency: Currency,
  baseCurrency: Currency
): Promise<{ amountBase: number; exchangeRateUsed: number }> {
  const rate = await getExchangeRate(fromCurrency, baseCurrency);
  const amountBase = fromCurrency === baseCurrency ? amount : parseFloat((amount * rate).toFixed(2));
  return { amountBase, exchangeRateUsed: rate };
}

/**
 * Format a monetary amount for display with tabular-nums and correct locale.
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const locale = currency === 'AED' ? 'en-AE' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
