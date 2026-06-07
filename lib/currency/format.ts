export type Currency = 'AED' | 'INR';

/**
 * Format a monetary amount for display with correct locale.
 * Uses Indian number grouping for INR (e.g. 1,82,000).
 * Safe to import from both client and server components.
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
