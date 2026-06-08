'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Rate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  is_manual: boolean;
  source: string | null;
}

interface Props { rates: Rate[]; userId: string; }

export default function ExchangeRateSettings({ rates, userId }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [fromCurrency, setFromCurrency] = useState('AED');
  const [toCurrency, setToCurrency] = useState('INR');
  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) { setError('Enter a valid rate.'); return; }
    setError('');
    setSuccess(false);

    startTransition(async () => {
      const { error: dbErr } = await supabase.from('exchange_rates').insert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rateNum,
        effective_date: effectiveDate,
        is_manual: true,
        overridden_by: userId,
        source: 'manual',
      });

      if (dbErr) { setError('Failed to save rate.'); return; }
      setRate('');
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    });
  }

  return (
    <div className="space-y-6">
      {/* Manual rate override */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Exchange Rate Override</h2>
        <p className="text-xs text-gray-500 mb-4">
          Manually set an exchange rate for a specific date. This overrides any auto-fetched rate for that date.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
              >
                <option value="AED">AED</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
              >
                <option value="INR">INR</option>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rate</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 23.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">Rate saved successfully.</p>}

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Rate'}
          </button>
        </form>
      </div>

      {/* Rate history */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Exchange Rates</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Pair</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Rate</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No rates found.</td>
              </tr>
            ) : rates.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-600 text-xs">{format(new Date(r.effective_date), 'dd MMM yyyy')}</td>
                <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{r.from_currency}/{r.to_currency}</td>
                <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{r.rate.toFixed(4)}</td>
                <td className="px-4 py-2.5">
                  {r.is_manual ? (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">Manual</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{r.source ?? 'Auto'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
