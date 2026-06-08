'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { assignProperty, removePropertyAssignment } from '../actions';
import UserModal from './UserModal';

interface Property { id: string; name: string; }
interface Assignment { id: string; property_id: string; property_name: string; }
interface UserRow {
  id: string; full_name: string; role: string;
  is_active: boolean; created_at: string;
  assignments: Assignment[];
}

interface Props { properties: Property[]; }

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  property_manager: 'Property Manager',
  read_only: 'Read Only',
};

export default function UsersPageContent({ properties }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignPropId, setAssignPropId] = useState<Record<string, string>>({});

  const { data: users, isLoading } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, is_active, created_at, property_assignments!property_assignments_user_id_fkey(id, property_id, properties!property_assignments_property_id_fkey(name))')
        .is('deleted_at', null)
        .order('full_name');
      if (error) throw error;

      return (data ?? []).map((u) => {
        const rawAssignments = (u.property_assignments as Array<{
          id: string; property_id: string;
          properties: { name: string } | null;
          deleted_at?: string | null;
        }> | null) ?? [];

        return {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          assignments: rawAssignments
            .filter((a) => !('deleted_at' in a) || a.deleted_at == null)
            .map((a) => ({
              id: a.id,
              property_id: a.property_id,
              property_name: a.properties?.name ?? '—',
            })),
        };
      });
    },
    staleTime: 30_000,
  });

  function handleAssign(userId: string) {
    const propId = assignPropId[userId];
    if (!propId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('property_id', propId);
      const result = await assignProperty({}, fd);
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        setAssignPropId((prev) => ({ ...prev, [userId]: '' }));
      }
    });
  }

  function handleRemoveAssignment(assignmentId: string) {
    startTransition(async () => {
      await removePropertyAssignment(assignmentId);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage users and property assignments.</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setModalOpen(true); }}
          className="px-4 py-2 bg-[#276EAC] hover:bg-[#1d5a8e] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Invite User
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : (users ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No users found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(users ?? []).map((u) => {
              const expanded = expandedId === u.id;
              const unassigned = properties.filter((p) => !u.assignments.find((a) => a.property_id === p.id));
              return (
                <div key={u.id}>
                  <div
                    className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50"
                    onClick={() => setExpandedId(expanded ? null : u.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#276EAC]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#276EAC]">{u.full_name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{u.full_name}</div>
                      <div className="text-xs text-gray-500">{ROLE_LABELS[u.role] ?? u.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-400">{u.assignments.length} prop</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditUser(u); setModalOpen(true); }}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700"
                      >
                        Edit
                      </button>
                      <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-6 pb-4 bg-gray-50/50 border-t border-gray-100">
                      <div className="pt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Property Assignments</p>
                        {u.assignments.length === 0 ? (
                          <p className="text-xs text-gray-400 mb-3">No properties assigned.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {u.assignments.map((a) => (
                              <span key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs">
                                {a.property_name}
                                <button
                                  onClick={() => handleRemoveAssignment(a.id)}
                                  disabled={isPending}
                                  className="text-red-400 hover:text-red-600 font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {unassigned.length > 0 && (
                          <div className="flex items-center gap-2">
                            <select
                              value={assignPropId[u.id] ?? ''}
                              onChange={(e) => setAssignPropId((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#276EAC]"
                            >
                              <option value="">Add property…</option>
                              {unassigned.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button
                              onClick={() => handleAssign(u.id)}
                              disabled={!assignPropId[u.id] || isPending}
                              className="px-3 py-1 text-xs bg-[#276EAC] text-white rounded-md disabled:opacity-40"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        editUser={editUser}
      />
    </div>
  );
}
