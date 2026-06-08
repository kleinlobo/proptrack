'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createIncomeRecord, updateIncomeRecord } from '@/app/(dashboard)/income/actions';
import { useScopedProperties, useRoomsForProperty } from '@/hooks/use-income';
import { formatCurrency, type Currency } from '@/lib/currency/format';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  property_id: z.string().min(1, 'Please select a property'),
  room_id: z.string().nullable().optional(),
  date: z.string().min(1, 'Date is required'),
  income_source: z.enum(['airbnb', 'booking_com', 'direct_booking', 'cash', 'monthly_rental', 'other']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const SOURCE_LABELS: Record<string, string> = {
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  direct_booking: 'Direct Booking',
  cash: 'Cash',
  monthly_rental: 'Monthly Rental',
  other: 'Other',
};

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  scopedPropertyIds: string[] | null;
  onSuccess: () => void;
}

export function IncomeModal({ open, onClose, editId, scopedPropertyIds, onSuccess }: Props) {
  const isEdit = !!editId;
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: properties = [] } = useScopedProperties(scopedPropertyIds);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      currency: 'AED',
      income_source: 'airbnb',
    },
  });

  const selectedPropertyId = watch('property_id');
  const { data: rooms = [] } = useRoomsForProperty(selectedPropertyId ?? null);

  // Auto-fill currency from property
  useEffect(() => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (prop) setValue('currency', prop.base_currency as 'AED' | 'INR');
  }, [selectedPropertyId, properties, setValue]);

  // Load existing record for edit
  useEffect(() => {
    if (isEdit && editId && open) {
      const supabase = createClient();
      supabase
        .from('income_records')
        .select('*')
        .eq('id', editId)
        .single()
        .then(({ data }) => {
          if (data) {
            reset({
              property_id: data.property_id,
              room_id: data.room_id ?? undefined,
              date: data.date,
              income_source: data.income_source as FormValues['income_source'],
              amount: data.amount,
              currency: data.currency as 'AED' | 'INR',
              notes: data.notes ?? '',
            });
          }
        });
    } else if (!isEdit && open) {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        currency: 'AED',
        income_source: 'airbnb',
      });
    }
  }, [editId, isEdit, open, reset]);

  // Live converted amount preview
  const amount = watch('amount');
  const currency = watch('currency');
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);

  useEffect(() => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (!prop || !amount || amount <= 0) { setConvertedPreview(null); return; }
    if (currency === prop.base_currency) { setConvertedPreview(null); return; }
    const supabase = createClient();
    const today = format(new Date(), 'yyyy-MM-dd');
    supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', currency)
      .eq('to_currency', prop.base_currency)
      .lte('effective_date', today)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const converted = amount * data.rate;
          setConvertedPreview(
            `Approx. ${formatCurrency(converted, prop.base_currency as Currency)} at today's rate (1 ${currency} = ${data.rate} ${prop.base_currency})`
          );
        }
      });
  }, [amount, currency, selectedPropertyId, properties]);

  function handleClose() {
    reset();
    setFormError(null);
    setConvertedPreview(null);
    onClose();
  }

  function onSubmit(values: FormValues) {
    setFormError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('property_id', values.property_id);
      if (values.room_id) fd.append('room_id', values.room_id);
      fd.append('date', values.date);
      fd.append('income_source', values.income_source);
      fd.append('amount', String(values.amount));
      fd.append('currency', values.currency);
      if (values.notes) fd.append('notes', values.notes);

      const result = isEdit && editId
        ? await updateIncomeRecord(editId, {}, fd)
        : await createIncomeRecord({}, fd);

      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); handleClose(); }
    });
  }

  const notesValue = watch('notes') ?? '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-neutral-800 rounded-md shadow-xl p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <DialogTitle className="text-lg font-semibold text-[var(--color-neutral-900)]">
            {isEdit ? 'Edit Income Record' : 'Add Income Record'}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-[var(--color-neutral-500)]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* API error banner */}
            {formError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800">
                <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" aria-hidden="true" />
                <p className="text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Property */}
            <div className="relative">
              <select
                {...register('property_id')}
                id="property_id"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none"
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label htmlFor="property_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">
                Property *
              </label>
              {errors.property_id && (
                <p className="mt-1.5 text-xs text-red-600">{errors.property_id.message}</p>
              )}
            </div>

            {/* Room */}
            <div className="relative">
              <select
                {...register('room_id')}
                id="room_id"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none"
                disabled={!selectedPropertyId}
              >
                <option value="">Entire property</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <label htmlFor="room_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">
                Room (optional)
              </label>
            </div>

            {/* Date */}
            <div className="relative">
              <input
                {...register('date')}
                id="date"
                type="date"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none"
              />
              <label htmlFor="date" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">
                Date *
              </label>
              {errors.date && (
                <p className="mt-1.5 text-xs text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Income Source */}
            <div className="relative">
              <select
                {...register('income_source')}
                id="income_source"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none"
              >
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <label htmlFor="income_source" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">
                Income Source *
              </label>
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  {...register('amount', { valueAsNumber: true })}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder=" "
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none"
                />
                <label
                  htmlFor="amount"
                  className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs"
                >
                  Amount *
                </label>
                {errors.amount && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>
                )}
              </div>
              {/* Currency toggle */}
              <div className="flex items-center gap-1 h-12 p-1 bg-neutral-100 rounded self-start">
                {(['AED', 'INR'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setValue('currency', cur)}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                      currency === cur
                        ? 'bg-[#276EAC] text-white'
                        : 'text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-900)]'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
                <input type="hidden" {...register('currency')} />
              </div>
            </div>

            {/* Converted amount preview */}
            {convertedPreview && (
              <div className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded text-sm text-[var(--color-neutral-500)]">
                {convertedPreview}
              </div>
            )}

            {/* Notes */}
            <div className="relative">
              <textarea
                {...register('notes')}
                id="notes"
                rows={3}
                maxLength={500}
                placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none resize-none"
              />
              <label
                htmlFor="notes"
                className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs"
              >
                Notes (optional)
              </label>
              <p className="mt-1.5 text-xs text-[var(--color-neutral-500)] text-right">
                {notesValue.length}/500
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#276EAC] hover:bg-[#1E5C91] text-white"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
