'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Committee, CommitteeDetail, PaginatedResponse } from '@/types';

import CommitteeCard from '@/components/committees/CommitteeCard';
import CreateCommitteeModal from '@/components/committees/CreateCommitteeModal';
import CommitteeDetailSheet from '@/components/committees/CommitteeDetailSheet';

import {
  Users,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function CommitteesSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card-glass p-6 flex flex-col gap-4">
            <div className="skeleton h-14 w-14 rounded-2xl" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommitteesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isPresident = user?.role === 'president';

  const [search, setSearch] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCommittee, setEditingCommittee] = React.useState<Committee | null>(null);
  const [selectedCommittee, setSelectedCommittee] = React.useState<CommitteeDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // ── Fetch Committees ────────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['committees', search],
    queryFn: () =>
      apiClient.get<{ success: boolean; count: number; committees: Committee[] }>('/committees', {
        search: search || undefined,
        limit: 50,
      }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const committees = data?.committees || [];

  // ── Delete Committee ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/committees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
    },
  });

  // ── View Committee Detail ───────────────────────────────────────────────────

  const handleView = async (committee: Committee) => {
    setSheetOpen(true);
    setDetailLoading(true);
    try {
      const response = await apiClient.get<any>(
        `/committees/${committee.id}`
      );
      setSelectedCommittee(response.committee);
    } catch {
      setSelectedCommittee(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEdit = (committee: Committee) => {
    setEditingCommittee(committee);
    setModalOpen(true);
  };

  const handleDelete = (committee: Committee) => {
    if (confirm(`Delete "${committee.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(committee.id);
    }
  };

  if (isLoading) return <CommitteesSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-text-primary">Failed to Load Committees</h3>
          <p className="text-sm text-text-secondary max-w-md">
            We couldn&apos;t connect to the Epic Club server. Please try again.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-secondary" />
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Committees
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {isPresident
              ? 'Manage all club committees, assign leaders and members.'
              : 'View committees and their members.'}
          </p>
        </div>

        {isPresident && (
          <button
            onClick={() => { setEditingCommittee(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Committee
          </button>
        )}
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: committees.length, gradient: 'from-secondary/20 to-primary/20' },
          {
            label: 'Total Members',
            value: committees.reduce((acc, c) => acc + (c.member_count || 0), 0),
            gradient: 'from-accent/20 to-blue-500/20',
          },
          {
            label: 'Avg Size',
            value:
              committees.length > 0
                ? Math.round(
                    committees.reduce((acc, c) => acc + (c.member_count || 0), 0) /
                      committees.length
                  )
                : 0,
            gradient: 'from-emerald-500/20 to-teal-500/20',
          },
          {
            label: 'Largest',
            value:
              committees.length > 0
                ? Math.max(...committees.map((c) => c.member_count || 0))
                : 0,
            gradient: 'from-warning/20 to-orange-500/20',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`card-glass bg-gradient-to-br ${stat.gradient} border border-white/10 p-4 rounded-2xl`}
          >
            <p className="text-2xl font-extrabold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search committees..."
            className="form-input pl-9 py-2.5 text-sm w-full"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-secondary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-secondary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid / List ──────────────────────────────────────────────────────── */}
      {committees.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
          <div className="p-4 rounded-full bg-secondary/10 text-secondary">
            <Users className="w-10 h-10" />
          </div>
          <p className="text-text-secondary">
            {search ? `No committees matching "${search}"` : 'No committees created yet.'}
          </p>
          {isPresident && (
            <button
              onClick={() => { setEditingCommittee(null); setModalOpen(true); }}
              className="btn-primary text-sm"
            >
              Create First Committee
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {committees.map((committee) => (
            <CommitteeCard
              key={committee.id}
              committee={committee}
              canEdit={isPresident}
              onView={handleView}
              onEdit={isPresident ? handleEdit : undefined}
              onDelete={isPresident ? handleDelete : undefined}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-2">
          {committees.map((committee) => (
            <div
              key={committee.id}
              className="card-glass border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-secondary/30 cursor-pointer transition-all group"
              onClick={() => handleView(committee)}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-text-primary flex-shrink-0">
                {committee.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">{committee.name}</p>
                <p className="text-sm text-text-secondary truncate">
                  {committee.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary flex-shrink-0">
                <Users className="w-4 h-4" />
                <span>{committee.member_count}</span>
              </div>
              {isPresident && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(committee); }}
                    className="btn-ghost p-2 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(committee); }}
                    className="btn-ghost p-2 text-sm text-error"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modals & Sheets ──────────────────────────────────────────────────── */}
      <CreateCommitteeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingCommittee={editingCommittee}
      />
      <CommitteeDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        committee={selectedCommittee}
        loading={detailLoading}
      />
    </div>
  );
}
