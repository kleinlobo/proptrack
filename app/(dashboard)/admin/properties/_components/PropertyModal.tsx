'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProperty, updateProperty } from '../actions';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  address: z.string().optional(),
  country_id: z.string().uuid('Select a country'),
  base_currency: z.enum(['AED', 'INR']),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Country { id: string; name: string; base_currency: string; }
interface Property {
  id: string; name: string; address: string | null;
  country_id: string; base_currency: string; is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  countries: Country[];
  editProp?: Property | null;
}

export default function PropertyModal({ open, onClose, onSuccess, countries, editProp }: Props) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState('');
  const isEdit = !!editProp;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', country_id: '', base_currency: 'AED', is_active: true },
  });

  useEffect(() => {
    if (!open) { setFormError(''); return; }
    if (editProp) {
      reset({
        name: editProp.name,
        address: editProp.address ?? '',
        country_id: editProp.country_id,
        base_currency: editProp.base_currency as 'AED' | 'INR',
        is_active: editProp.is_active,
      });
    } else {
      reset({ name: '', address: '', country_id: '', base_currency: 'AED', is_active: true });
    }
  }, [open, editProp, reset]);

  function onSubmit(values: FormValues) {
    setFormError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.append('name', values.name);
      if (values.address) fd.append('address', values.address);
      fd.append('country_id', values.country_id);
      fd.append('base_currency', values.base_currency);
      fd.append('is_active', String(values.is_active));

      const result = isEdit && editProp
        ? await updateProperty(editProp.id, {}, fd)
        : await createProperty({}, fd);

      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); onClose(); }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Property' : 'Add Property'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Property Name *</label>
            <input {...register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]" placeholder="Ajman Villa" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input {...register('address')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]" placeholder="Street, City" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country *</label>
              <select {...register('country_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]">
                <option value="">Select country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.country_id && <p className="text-xs text-red-600 mt-1">{errors.country_id.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Currency *</label>
              <select {...register('base_currency')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]">
                <option value="AED">AED</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-gray-300" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
