'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inviteUser, updateUser } from '../actions';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'read_only', label: 'Read Only' },
] as const;

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(['super_admin', 'property_manager', 'read_only']),
});

const editSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(['super_admin', 'property_manager', 'read_only']),
  is_active: z.boolean(),
});

type InviteValues = z.infer<typeof inviteSchema>;
type EditValues = z.infer<typeof editSchema>;

interface UserRow { id: string; full_name: string; role: string; is_active: boolean; }
interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: UserRow | null;
}

export default function UserModal({ open, onClose, onSuccess, editUser }: Props) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState('');
  const isEdit = !!editUser;

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', full_name: '', role: 'read_only' },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: '', role: 'read_only', is_active: true },
  });

  useEffect(() => {
    if (!open) { setFormError(''); return; }
    if (editUser) {
      editForm.reset({ full_name: editUser.full_name, role: editUser.role as EditValues['role'], is_active: editUser.is_active });
    } else {
      inviteForm.reset({ email: '', full_name: '', role: 'read_only' });
    }
  }, [open, editUser]); // eslint-disable-line react-hooks/exhaustive-deps

  function onInviteSubmit(values: InviteValues) {
    setFormError('');
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, String(v)));
      const result = await inviteUser({}, fd);
      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); onClose(); }
    });
  }

  function onEditSubmit(values: EditValues) {
    setFormError('');
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, String(v)));
      const result = await updateUser(editUser!.id, {}, fd);
      if (result.error) { setFormError(result.error); return; }
      if (result.success) { onSuccess(); onClose(); }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit User' : 'Invite User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input {...editForm.register('full_name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]" />
              {editForm.formState.errors.full_name && <p className="text-xs text-red-600 mt-1">{editForm.formState.errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select {...editForm.register('role')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...editForm.register('is_active')} className="rounded border-gray-300" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
            {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button type="submit" disabled={isPending} className="px-5 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input {...inviteForm.register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]" placeholder="user@example.com" />
              {inviteForm.formState.errors.email && <p className="text-xs text-red-600 mt-1">{inviteForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input {...inviteForm.register('full_name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]" placeholder="John Smith" />
              {inviteForm.formState.errors.full_name && <p className="text-xs text-red-600 mt-1">{inviteForm.formState.errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select {...inviteForm.register('role')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#276EAC]">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button type="submit" disabled={isPending} className="px-5 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                {isPending ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
