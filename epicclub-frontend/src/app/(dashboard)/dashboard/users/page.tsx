'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, UserX, Crown, Users, Search, MoreVertical, Shield, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User as AuthUser, Committee } from '@/types';

const mockUsers = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@epicclub.com', role: 'committee_leader', status: 'approved', committee: 'Technical Committee', joined: '2026-01-10' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@epicclub.com', role: 'member', status: 'approved', committee: 'Social Committee', joined: '2026-02-15' },
  { id: 'u3', name: 'Carol White', email: 'carol@epicclub.com', role: 'member', status: 'pending', committee: null, joined: '2026-06-20' },
  { id: 'u4', name: 'David Lee', email: 'david@epicclub.com', role: 'member', status: 'approved', committee: 'Sports & Wellness', joined: '2026-03-01' },
  { id: 'u5', name: 'Eva Martinez', email: 'eva@epicclub.com', role: 'member', status: 'pending', committee: null, joined: '2026-06-21' },
];

const roleColors: Record<string, string> = {
  president: 'text-warning bg-warning/10 border-warning/20',
  committee_leader: 'text-secondary bg-secondary/10 border-secondary/20',
  member: 'text-text-secondary bg-white/5 border-white/10',
};

const statusColors: Record<string, string> = {
  approved: 'text-success bg-success/10 border-success/20',
  pending: 'text-warning bg-warning/10 border-warning/20',
  rejected: 'text-error bg-error/10 border-error/20',
};

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  committee: string | null;
  joined: string;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<DisplayUser[]>(mockUsers);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Queries
  const { data: usersData } = useQuery({
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
    mutationFn: (userId: string) =>
      apiClient.patch(`/users/${userId}/approve`, { role: 'member', committee_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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

  // Sync real users list into local state if available
  useEffect(() => {
    if (usersData && usersData.length > 0) {
      setUsers(
        usersData.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
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

  const approve = async (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'approved' } : u)));
    try {
      if (usersData && usersData.some(u => u.id === id)) {
        await approveMutation.mutateAsync(id);
      }
    } catch (err) {
      console.error('Failed to approve user:', err);
    }
  };

  const reject = async (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'rejected' } : u)));
    try {
      if (usersData && usersData.some(u => u.id === id)) {
        await rejectMutation.mutateAsync(id);
      }
    } catch (err) {
      console.error('Failed to reject user:', err);
    }
  };

  const pending = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <Crown className="w-6 h-6 text-warning" /> Admin Panel
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage members and approvals</p>
        </div>
        {pending > 0 && (
          <span className="px-3 py-1.5 bg-warning/10 text-warning border border-warning/20 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {pending} pending approval{pending > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: users.length, icon: <Users className="w-4 h-4" />, color: 'text-secondary' },
          { label: 'Approved', value: users.filter(u => u.status === 'approved').length, icon: <UserCheck className="w-4 h-4" />, color: 'text-success' },
          { label: 'Pending', value: pending, icon: <Clock className="w-4 h-4" />, color: 'text-warning' },
        ].map((s) => (
          <div key={s.label} className="card-glass p-4 flex items-center gap-3">
            <div className={`${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-black text-text-primary">{s.value}</p>
              <p className="text-xs text-text-secondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
        <input
          className="input pl-10 w-full"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="card-glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-5 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Member</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider hidden md:table-cell">Role</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Committee</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{user.name}</p>
                      <p className="text-[11px] text-text-secondary">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${roleColors[user.role]}`}>
                    {user.role === 'committee_leader' ? 'Leader' : user.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span className="text-xs text-text-secondary">{user.committee || '—'}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColors[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {user.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve(user.id)}
                        className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors border border-success/20"
                        title="Approve"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => reject(user.id)}
                        className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors border border-error/20"
                        title="Reject"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-text-secondary text-sm">No members found.</div>
        )}
      </div>
    </div>
  );
}
