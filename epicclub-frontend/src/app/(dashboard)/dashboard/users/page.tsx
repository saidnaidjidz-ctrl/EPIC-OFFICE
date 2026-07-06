'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  UserX, 
  Crown, 
  Users, 
  Search, 
  Shield, 
  Clock, 
  ChevronDown, 
  UserMinus, 
  ShieldAlert, 
  X, 
  Settings2,
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User as AuthUser, Committee } from '@/types';

// Styling maps
const roleColors: Record<string, string> = {
  president: 'text-warning bg-warning/10 border-warning/20 shadow-glow-amber/5',
  committee_leader: 'text-secondary bg-secondary/10 border-secondary/20 shadow-glow-cyan/5',
  member: 'text-text-secondary bg-white/5 border-white/10',
};

const statusColors: Record<string, string> = {
  approved: 'text-success bg-success/10 border-success/20',
  pending: 'text-warning bg-warning/10 border-warning/20 animate-pulse-slow',
  rejected: 'text-error bg-error/10 border-error/20',
};

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  committee_id: string | null;
  committee: string | null;
  joined: string;
}

// ─── Manage User Modal ─────────────────────────────────────────────────────────

interface ManageUserModalProps {
  user: DisplayUser;
  committees: Committee[];
  isApproving: boolean; // true if approving a pending user, false if modifying role
  onConfirm: (payload: { role: string; committee_id: string | null }) => void;
  onClose: () => void;
  isLoading: boolean;
}

function ManageUserModal({ user, committees, isApproving, onConfirm, onClose, isLoading }: ManageUserModalProps) {
  const [selectedRole, setSelectedRole] = useState(user.role === 'president' ? 'member' : user.role);
  const [selectedCommittee, setSelectedCommittee] = useState(user.committee_id || '');

  // Reset committee if changing to a role that does not require one (members can have no committee)
  // Leaders must be assigned to a committee.
  const canSubmit = selectedRole === 'member' || !!selectedCommittee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({
      role: selectedRole,
      committee_id: selectedCommittee || null,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.form
          onSubmit={handleSubmit}
          className="relative card-glass w-full max-w-md p-6 flex flex-col gap-5 z-10 overflow-hidden"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        >
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />

          {/* Close Button */}
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-white/10 text-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {isApproving ? 'Approve User Request' : 'Manage User Role & Committee'}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {isApproving ? 'Set initial access level and assignments' : 'Update membership status'}
              </p>
            </div>
          </div>

          {/* User Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/40 border border-border/40">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-sm truncate">{user.name}</p>
              <p className="text-[11px] text-text-secondary truncate">{user.email}</p>
            </div>
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              System Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'member', label: 'Member', desc: 'General club access' },
                { value: 'committee_leader', label: 'Leader', desc: 'Committee operations' }
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    selectedRole === r.value 
                      ? 'border-secondary bg-secondary/5 shadow-glow-cyan/5' 
                      : 'border-border/40 hover:border-border/80 hover:bg-white/[0.01]'
                  }`}
                >
                  <span className={`text-sm font-bold ${selectedRole === r.value ? 'text-secondary' : 'text-text-primary'}`}>
                    {r.label}
                  </span>
                  <span className="text-[10px] text-text-secondary leading-tight">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Committee Assignment */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Assigned Committee {selectedRole === 'committee_leader' && <span className="text-error">*</span>}
              </label>
              {selectedRole === 'member' && (
                <span className="text-[10px] text-text-secondary">(Optional)</span>
              )}
            </div>
            <div className="relative">
              <select
                id="user-committee-select"
                value={selectedCommittee}
                onChange={(e) => setSelectedCommittee(e.target.value)}
                className="input w-full appearance-none pr-8 text-sm"
              >
                <option value="">{selectedRole === 'committee_leader' ? '— Select Committee —' : 'No Committee Assigned'}</option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
            {selectedRole === 'committee_leader' && !selectedCommittee && (
              <p className="text-[10px] text-error font-medium">Leaders must be assigned to a committee.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border/20">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 text-sm py-2.5"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              id="confirm-manage-user-btn"
              type="submit"
              disabled={!canSubmit || isLoading}
              className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? <UserCheck className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
              {isLoading ? 'Saving...' : isApproving ? 'Approve & Save' : 'Save Changes'}
            </button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Panel Page ──────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [manageTarget, setManageTarget] = useState<{ user: DisplayUser; isApproving: boolean } | null>(null);
  
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Queries
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get<{ users: AuthUser[] }>('/users?limit=50');
      return res.users || [];
    },
    enabled: !!currentUser && currentUser.role === 'president',
  });

  const { data: committeesRes } = useQuery({
    queryKey: ['committees-list'],
    queryFn: () => apiClient.get<{ committees: Committee[] }>('/committees'),
    enabled: !!currentUser && currentUser.role === 'president',
  });

  const committeesList = committeesRes?.committees || [];
  const committeeMap = useMemo(() => {
    const map = new Map<string, string>();
    committeesList.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [committeesList]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ userId, role, committee_id }: { userId: string; role: string; committee_id: string | null }) =>
      apiClient.patch(`/users/${userId}/approve`, { role, committee_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setManageTarget(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch(`/users/${userId}/reject`, { reason: 'Administrative decision' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role, committee_id }: { userId: string; role: string; committee_id: string | null }) =>
      apiClient.patch(`/users/${userId}/role`, { role, committee_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setManageTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // Sync users list to local state
  useEffect(() => {
    if (usersData) {
      setUsers(
        usersData.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          committee_id: u.committee_id,
          committee: u.committee_id ? (committeeMap.get(u.committee_id) || null) : null,
          joined: u.created_at ? (u.created_at.split('T')[0] ?? '2026-06-25') : '2026-06-25',
        }))
      );
    }
  }, [usersData, committeeMap]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleApproveClick = (user: DisplayUser) => {
    setManageTarget({ user, isApproving: true });
  };

  const handleRejectClick = async (user: DisplayUser) => {
    if (confirm(`Are you sure you want to reject the registration request of "${user.name}"?`)) {
      try {
        await rejectMutation.mutateAsync(user.id);
      } catch (err) {
        console.error('Failed to reject user:', err);
      }
    }
  };

  const handleManageClick = (user: DisplayUser) => {
    setManageTarget({ user, isApproving: false });
  };

  const handleModalConfirm = async (payload: { role: string; committee_id: string | null }) => {
    if (!manageTarget) return;
    
    try {
      if (manageTarget.isApproving) {
        await approveMutation.mutateAsync({
          userId: manageTarget.user.id,
          ...payload,
        });
      } else {
        await updateRoleMutation.mutateAsync({
          userId: manageTarget.user.id,
          ...payload,
        });
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteClick = async (user: DisplayUser) => {
    if (confirm(`Are you sure you want to delete user "${user.name}"? This will revoke all active sessions.`)) {
      try {
        await deleteMutation.mutateAsync(user.id);
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Settings / Approval Modal */}
      {manageTarget && (
        <ManageUserModal
          user={manageTarget.user}
          committees={committeesList}
          isApproving={manageTarget.isApproving}
          onConfirm={handleModalConfirm}
          onClose={() => setManageTarget(null)}
          isLoading={approveMutation.isPending || updateRoleMutation.isPending}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary flex items-center gap-3">
            <Crown className="w-8 h-8 text-warning drop-shadow-glow-amber" /> 
            Admin Control Panel
          </h1>
          <p className="text-sm text-text-secondary mt-1">Manage member rosters, approvals, and committee leader assignments</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse-slow">
            <Clock className="w-3.5 h-3.5" />
            {pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Registered Members', value: users.length, icon: <Users className="w-5 h-5 text-secondary" />, bg: 'bg-secondary/5' },
          { label: 'Active & Approved', value: users.filter(u => u.status === 'approved').length, icon: <UserCheck className="w-5 h-5 text-success" />, bg: 'bg-success/5' },
          { label: 'Awaiting Approvals', value: pendingCount, icon: <Clock className="w-5 h-5 text-warning" />, bg: 'bg-warning/5' },
        ].map((s) => (
          <div key={s.label} className="card-glass p-5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-radial from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="space-y-1">
              <p className="text-2xl font-black text-text-primary tracking-tight">{s.value}</p>
              <p className="text-xs text-text-secondary font-medium">{s.label}</p>
            </div>
            <div className={`p-3 rounded-xl border border-border/40 ${s.bg}`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
        <input
          className="input pl-10 w-full"
          placeholder="Search roster by name or email address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Roster Table */}
      <div className="card-glass overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/40 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Member Details</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Committee Assignment</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="border-b border-border/20 last:border-0 hover:bg-white/[0.015] transition-colors"
                  >
                    {/* User Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-text-primary text-sm truncate">{user.name}</p>
                          <p className="text-[11px] text-text-secondary truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${roleColors[user.role] || roleColors.member}`}>
                        {user.role === 'committee_leader' ? 'Leader' : user.role}
                      </span>
                    </td>

                    {/* Committee name */}
                    <td className="px-6 py-4 hidden lg:table-cell text-text-secondary text-sm">
                      {user.committee || <span className="opacity-40">—</span>}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColors[user.status]}`}>
                        {user.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Pending Verification/Approval Buttons */}
                        {user.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveClick(user)}
                              className="p-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all border border-success/20 shadow-glow-success/5"
                              title="Approve Member"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectClick(user)}
                              className="p-2 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all border border-error/20"
                              title="Reject Request"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Approved Members Modifications */}
                        {user.status === 'approved' && user.role !== 'president' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleManageClick(user)}
                              className="px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all border border-secondary/20 font-semibold text-xs flex items-center gap-1"
                              title="Change Role or Committee"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Manage
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-2 rounded-xl bg-white/5 text-text-secondary hover:bg-error/10 hover:text-error hover:border-error/20 transition-all border border-transparent"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* President Indicator */}
                        {user.role === 'president' && (
                          <span className="flex items-center gap-1 text-[11px] text-warning/70 font-semibold uppercase tracking-wider">
                            <Shield className="w-3.5 h-3.5" /> Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !isUsersLoading && (
          <div className="py-16 text-center text-text-secondary text-sm flex flex-col items-center gap-2">
            <Users className="w-8 h-8 opacity-25" />
            <span>No registered members match your search criteria.</span>
          </div>
        )}
      </div>
    </div>
  );
}
