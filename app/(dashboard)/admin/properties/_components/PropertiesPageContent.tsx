'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { togglePropertyActive } from '../actions';
import PropertyModal from './PropertyModal';

interface Country { id: string; name: string; base_currency: string; }
interface Property {
  id: string; name: string; address: string | null;
  country_id: string; base_currency: string; is_active: boolean;
  country_name: string;
}
interface Props { countries: Country[]; }

export default function PropertiesPageContent({ countries }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, countries!properties_country_id_fkey(name)')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        country_id: p.country_id,
        base_currency: p.base_currency,
        is_active: p.is_active,
        country_name: (p.countries as { name: string } | null)?.name ?? '—',
      }));
    },
    staleTime: 30_000,
  });

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await togglePropertyActive(id, !current);
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Manage rental properties.</p>
        </div>
        <button
          onClick={() => { setEditProp(null); setModalOpen(true); }}
          className="px-4 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Property
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : (properties ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No properties found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Currency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(properties ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.country_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.base_currency}</td>
                  <td className="px-4 py-3 text-gray-500">{p.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditProp(p); setModalOpen(true); }}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(p.id, p.is_active)}
                        disabled={isPending}
                        className={`px-3 py-1 text-xs border rounded-md transition-colors disabled:opacity-50 ${p.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PropertyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-properties'] })}
        countries={countries}
        editProp={editProp}
      />
    </div>
  );
}
