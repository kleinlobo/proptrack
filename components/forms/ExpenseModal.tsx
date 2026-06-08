'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, XCircle, X, Paperclip, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createExpenseRecord, updateExpenseRecord } from '@/app/(dashboard)/expenses/actions';
import { useScopedProperties, useRoomsForProperty } from '@/hooks/use-income';
import { useExpenseCategories } from '@/hooks/use-expenses';
import { formatCurrency, type Currency } from '@/lib/currency/format';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  property_id: z.string().min(1, 'Please select a property'),
  room_id: z.string().nullable().optional(),
  category_id: z.string().min(1, 'Please select a category'),
  vendor: z.string().max(200).optional(),
  payment_method: z.enum(['bank_transfer', 'cash', 'credit_card', 'cheque', 'online_payment', 'other']),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  currency: z.enum(['AED', 'INR']),
  status: z.enum(['pending_confirmation', 'confirmed']),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  scopedPropertyIds: string[] | null;
  onSuccess: () => void;
}

export function ExpenseModal({ open, onClose, editId, scopedPropertyIds, onSuccess }: Props) {
  const isEdit = !!editId;
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);

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
      date: format(new Date(), 'yyyy-MM-dd'),
      currency: 'AED',
      status: 'confirmed' as const,
      payment_method: 'bank_transfer' as const,
    },
  });

  const selectedPropertyId = watch('property_id');
  const { data: rooms = [] } = useRoomsForProperty(selectedPropertyId ?? null);
  const amount = watch('amount');
  const currency = watch('currency');

  // Auto-fill currency from property
  useEffect(() => {
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (prop) setValue('currency', prop.base_currency as 'AED' | 'INR');
  }, [selectedPropertyId, properties, setValue]);

  // Load record for edit
  useEffect(() => {
    if (isEdit && editId && open) {
      const supabase = createClient();
      supabase
        .from('expense_records')
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
              payment_method: (data.payment_method ?? 'bank_transfer') as FormValues['payment_method'],
              date: data.date,
              amount: data.amount,
              currency: data.currency as 'AED' | 'INR',
              status: data.status as 'pending_confirmation' | 'confirmed',
              notes: data.notes ?? '',
            });
            setReceiptPath(data.attachment_url);
          }
        });
    } else if (!isEdit && open) {
      reset({ date: format(new Date(), 'yyyy-MM-dd'), currency: 'AED', status: 'confirmed' });
      setReceiptPath(null);
    }
  }, [editId, isEdit, open, reset]);

  // Live currency preview
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/v1/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { setUploadError(json.error ?? 'Upload failed'); return; }
      setReceiptPath(json.path as string);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    reset();
    setFormError(null);
    setReceiptPath(null);
    setUploadError(null);
    setConvertedPreview(null);
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
      fd.append('date', values.date);
      fd.append('amount', String(values.amount));
      fd.append('currency', values.currency);
      fd.append('status', values.status);
      if (receiptPath) fd.append('attachment_url', receiptPath);
      if (values.notes) fd.append('notes', values.notes);

      const result = isEdit && editId
        ? await updateExpenseRecord(editId, {}, fd)
        : await createExpenseRecord({}, fd);

      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); handleClose(); }
    });
  }

  // Group categories: parents first, then children indented
  const parents = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);

  const notesValue = watch('notes') ?? '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-neutral-800 rounded-md shadow-xl p-0">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-700">
          <DialogTitle className="text-lg font-semibold text-[var(--color-neutral-900)]">
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" aria-label="Close modal">
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
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Select property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label htmlFor="property_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Property *</label>
              {errors.property_id && <p className="mt-1.5 text-xs text-red-600">{errors.property_id.message}</p>}
            </div>

            {/* Room */}
            <div className="relative">
              <select {...register('room_id')} id="room_id" disabled={!selectedPropertyId}
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Entire property</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label htmlFor="room_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Room (optional)</label>
            </div>

            {/* Category */}
            <div className="relative">
              <select {...register('category_id')} id="category_id"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="">Select category</option>
                {parents.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={p.id}>{p.name} (general)</option>
                    {children.filter((c) => c.parent_id === p.id).map((c) => (
                      <option key={c.id} value={c.id}>{'  '}{c.name}</option>
                    ))}
                  </optgroup>
                ))}
                {children.filter((c) => !parents.find((p) => p.id === c.parent_id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label htmlFor="category_id" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Category *</label>
              {errors.category_id && <p className="mt-1.5 text-xs text-red-600">{errors.category_id.message}</p>}
            </div>

            {/* Vendor */}
            <div className="relative">
              <input {...register('vendor')} id="vendor" type="text" placeholder=" " maxLength={200}
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none" />
              <label htmlFor="vendor" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                Vendor (optional)
              </label>
            </div>

            {/* Payment Method */}
            <div className="relative">
              <select {...register('payment_method')} id="payment_method"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none appearance-none">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="cheque">Cheque</option>
                <option value="online_payment">Online Payment</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="payment_method" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Payment Method *</label>
            </div>

            {/* Date */}
            <div className="relative">
              <input {...register('date')} id="date" type="date"
                className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none" />
              <label htmlFor="date" className="absolute left-4 top-2 text-xs font-medium text-[var(--color-neutral-500)] pointer-events-none">Date *</label>
              {errors.date && <p className="mt-1.5 text-xs text-red-600">{errors.date.message}</p>}
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input {...register('amount', { valueAsNumber: true })} id="amount" type="number" step="0.01" min="0.01" placeholder=" "
                  className="peer w-full h-12 px-4 pt-5 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none" />
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

            {convertedPreview && (
              <div className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded text-sm text-[var(--color-neutral-500)]">
                {convertedPreview}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">Status:</span>
              {([['confirmed', 'Confirmed'], ['pending_confirmation', 'Pending']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" {...register('status')} value={val}
                    className="w-4 h-4 accent-[#276EAC]" />
                  <span className="text-sm text-[var(--color-neutral-700)]">{label}</span>
                </label>
              ))}
            </div>

            {/* Receipt upload */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[var(--color-neutral-500)]">Receipt (optional)</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded border border-neutral-300 text-sm text-[var(--color-neutral-600)] hover:border-[#276EAC] hover:text-[#276EAC] transition-colors disabled:opacity-50">
                  {uploading
                    ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    : <Paperclip className="w-4 h-4" aria-hidden="true" />}
                  {uploading ? 'Uploading…' : 'Attach file'}
                </button>
                {receiptPath && (
                  <div className="flex items-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>File attached</span>
                    <button type="button" onClick={() => setReceiptPath(null)} className="ml-1 text-[var(--color-neutral-400)] hover:text-[var(--color-error)]" aria-label="Remove receipt">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" className="hidden" onChange={handleFileChange} />
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <p className="text-xs text-[var(--color-neutral-400)]">PDF, JPG, PNG, HEIC — max 10 MB</p>
            </div>

            {/* Notes */}
            <div className="relative">
              <textarea {...register('notes')} id="notes" rows={3} maxLength={500} placeholder=" "
                className="peer w-full px-4 pt-6 pb-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-sm text-[var(--color-neutral-900)] transition-all focus:border-2 focus:border-[#276EAC] focus:outline-none resize-none" />
              <label htmlFor="notes" className="absolute left-4 top-3.5 text-sm text-[var(--color-neutral-500)] transition-all pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#276EAC] peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                Notes (optional)
              </label>
              <p className="mt-1.5 text-xs text-[var(--color-neutral-500)] text-right">{notesValue.length}/500</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || uploading} className="bg-[#276EAC] hover:bg-[#1E5C91] text-white">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
