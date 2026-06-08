'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createRecurringExpense, updateRecurringExpense } from '@/app/(dashboard)/expenses/recurring/actions';
import { useScopedProperties, useRoomsForProperty } from '@/hooks/use-income';
import { useExpenseCategories } from '@/hooks/use-expenses';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  property_id: z.string().min(1, 'Please select a property'),
  room_id: z.string().nullable().optional(),
  category_id: z.string().min(1, 'Please select a category'),
  vendor: z.string().max(200).optional(),
  payment_method: z.enum(['bank_transfer', 'cash', 'credit_card', 'cheque', 'online_payment', 'other']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  recurrence_type: z.enum(['weekly', 'monthly', 'quarterly', 'annually']),
  day_of_month: z.coerce.number().min(1).max(28).nullable().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  scopedPropertyIds: string[] | null;
  onSuccess: () => void;
}

export function RecurringModal({ open, onClose, editId, scopedPropertyIds, onSuccess }: Props) {
  const isEdit = !!editId;
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: properties = [] } = useScopedProperties(scopedPropertyIds);
  const { data: categories = [] } = useExpenseCategories();

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
      start_date: format(new Date(), 'yyyy-MM-dd'),
      currency: 'AED',
      recurrence_type: 'monthly',
      payment_method: 'bank_transfer',
      day_of_month: 1,
    },
  });

  const selectedPropertyId = watch('property_id');
  const recurrenceType = watch('recurrence_type');
  const { data: rooms = [] } = useRoomsForProperty(selectedPropertyId ?? null);

  // Auto-fill currency
  useEffect(() => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (prop) setValue('currency', prop.base_currency as 'AED' | 'INR');
  }, [selectedPropertyId, properties, setValue]);

  // Load for edit
  useEffect(() => {
    if (isEdit && editId && open) {
      const supabase = createClient();
      supabase
        .from('recurring_expenses')
        .select('*')
        .eq('id', editId)
        .single()
        .then(({ data }) => {
          if (data) {
            reset({
              property_id: data.property_id,
              room_id: data.room_id ?? undefined,
              category_id: data.category_id,
              vendor: data.vendor ?? '',
              payment_method: data.payment_method as FormValues['payment_method'],
              amount: data.amount,
              currency: data.currency as 'AED' | 'INR',
              recurrence_type: data.recurrence_type as FormValues['recurrence_type'],
              day_of_month: data.day_of_month ?? 1,
              start_date: data.start_date,
              end_date: data.end_date ?? '',
              notes: data.notes ?? '',
            });
          }
        });
    } else if (!isEdit && open) {
      reset({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        currency: 'AED',
        recurrence_type: 'monthly',
        payment_method: 'bank_transfer',
        day_of_month: 1,
      });
    }
  }, [editId, isEdit, open, reset]);

  function handleClose() {
    reset();
    setFormError(null);
    onClose();
  }

  function onSubmit(values: FormValues) {
    setFormError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('property_id', values.property_id);
      if (values.room_id) fd.append('room_id', values.room_id);
      fd.append('category_id', values.category_id);
      if (values.vendor) fd.append('vendor', values.vendor);
      fd.append('payment_method', values.payment_method);
      fd.append('amount', String(values.amount));
      fd.append('currency', values.currency);
      fd.append('recurrence_type', values.recurrence_type);
      if (values.day_of_month != null) fd.append('day_of_month', String(values.day_of_month));
      fd.append('start_date', values.start_date);
      if (values.end_date) fd.append('end_date', values.end_date);
      if (values.notes) fd.append('notes', values.notes);

      const result = isEdit && editId
        ? await updateRecurringExpense(editId, {}, fd)
        : await createRecurringExpense({}, fd);

      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); handleClose(); }
    });
  }

  const showDayOfMonth = recurrenceType !== 'weekly';
  const parents = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);
  const currency = watch('currency');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-neutral-800 rounded-md shadow-xl p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <DialogTitle className="text-lg font-semibold text-[var(--color-neutral-900)]">
            {isEdit ? 'Edit Recurring Expense' : 'New Recurring Expense'}
          </DialogTitle>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-[var(--color-neutral-500)]" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {formError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800">
                <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" aria-hidden="true" />
                <p className="text-sm font-medium">{formError}</p>
              </div>
            )}

            {/* Property */}
            <div className="relative">
              <select {...register('property_id')} id="property_id"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Select property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label htmlFor="property_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Property *</label>
              {errors.property_id && <p className="mt-1.5 text-xs text-red-600">{errors.property_id.message}</p>}
            </div>

            {/* Room */}
            <div className="relative">
              <select {...register('room_id')} id="room_id" disabled={!selectedPropertyId}
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Entire property</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label htmlFor="room_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Room (optional)</label>
            </div>

            {/* Category */}
            <div className="relative">
              <select {...register('category_id')} id="category_id"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Select category</option>
                {parents.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.id}>{p.name} (general)</option>
                    {children.filter((c) => c.parent_id === p.id).map((c) => (
                      <option key={c.id} value={c.id}>{'  '}{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <label htmlFor="category_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Category *</label>
              {errors.category_id && <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>}
            </div>

            {/* Vendor */}
            <div className="relative">
              <input {...register('vendor')} id="vendor" type="text" placeholder=" " maxLength={200}
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none" />
              <label htmlFor="vendor" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                Vendor (optional)
              </label>
            </div>

            {/* Payment Method */}
            <div className="relative">
              <select {...register('payment_method')} id="payment_method"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="cheque">Cheque</option>
                <option value="online_payment">Online Payment</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="payment_method" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Payment Method *</label>
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input {...register('amount', { valueAsNumber: true })} id="amount" type="number" step="0.01" min="0.01" placeholder=" "
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none" />
                <label htmlFor="amount" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                  Amount *
                </label>
                {errors.amount && <p className="mt-1.5 text-xs text-red-600">{errors.amount.message}</p>}
              </div>
              <div className="flex items-center gap-1 h-12 p-1 bg-neutral-100 rounded self-start">
                {(['AED', 'INR'] as const).map((cur) => (
                  <button key={cur} type="button" onClick={() => setValue('currency', cur)}
                    className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${currency === cur ? 'bg-[#276EAC] text-white' : 'text-[var(--color-neutral-600)] hover:text-[var(--color-neutral-900)]'}`}>
                    {cur}
                  </button>
                ))}
                <input type="hidden" {...register('currency')} />
              </div>
            </div>

            {/* Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select {...register('recurrence_type')} id="recurrence_type"
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                  {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <label htmlFor="recurrence_type" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Frequency *</label>
              </div>
              {showDayOfMonth && (
                <div className="relative">
                  <input {...register('day_of_month', { valueAsNumber: true })} id="day_of_month" type="number" min="1" max="28" placeholder=" "
                    className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none" />
                  <label htmlFor="day_of_month" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                    Day of month (1–28)
                  </label>
                </div>
              )}
            </div>

            {/* Start / End dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input {...register('start_date')} id="start_date" type="date"
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none" />
                <label htmlFor="start_date" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Start Date *</label>
                {errors.start_date && <p className="mt-1.5 text-xs text-red-600">{errors.start_date.message}</p>}
              </div>
              <div className="relative">
                <input {...register('end_date')} id="end_date" type="date"
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none" />
                <label htmlFor="end_date" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">End Date (optional)</label>
              </div>
            </div>

            {/* Notes */}
            <div className="relative">
              <textarea {...register('notes')} id="notes" rows={2} maxLength={500} placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] focus:border-2 focus:border-[#276EAC] focus:outline-none resize-none" />
              <label htmlFor="notes" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                Notes (optional)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-[#276EAC] hover:bg-[#1E5C91] text-white">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
