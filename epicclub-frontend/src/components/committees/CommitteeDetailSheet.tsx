'use client';

import React from 'react';
import { X, Users, CheckSquare, Crown, Calendar, BarChart3 } from 'lucide-react';
import type { CommitteeDetail } from '@/types';

interface CommitteeDetailSheetProps {
  open: boolean;
  onClose: () => void;
  committee: CommitteeDetail | null;
  loading?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:     { label: 'Pending',     className: 'badge-warning' },
  in_progress: { label: 'In Progress', className: 'badge-info'    },
  completed:   { label: 'Completed',   className: 'badge-success' },
  overdue:     { label: 'Overdue',     className: 'badge-error'   },
};

export default function CommitteeDetailSheet({
  open,
  onClose,
  committee,
  loading,
}: CommitteeDetailSheetProps) {
  if (!open) return null;

  const taskStats = committee?.task_stats;
  const completionRate = taskStats && taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet Panel */}
      <div className="w-full max-w-md bg-surface border-l border-white/10 overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-surface/90 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-text-primary">Committee Details</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col gap-6 p-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
        ) : committee ? (
          <div className="flex flex-col gap-6 p-6">
            {/* Identity Block */}
            <div className="flex flex-col gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/30 to-accent/30 flex items-center justify-center text-2xl font-extrabold text-text-primary border border-white/10">
                {committee.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-text-primary">{committee.name}</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {committee.description || 'No description available.'}
                </p>
              </div>
            </div>

            {/* Leader */}
            {committee.leader && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <Crown className="w-4 h-4 text-warning flex-shrink-0" />
                <div>
                  <p className="text-xs text-warning">Committee Leader</p>
                  <p className="text-sm font-semibold text-text-primary">{committee.leader.name}</p>
                  <p className="text-xs text-text-secondary">{committee.leader.email}</p>
                </div>
              </div>
            )}

            {/* Task Stats */}
            {taskStats && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-text-secondary text-sm font-semibold">
                  <BarChart3 className="w-4 h-4" /> Task Overview
                </div>
                {/* Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Completion Rate</span>
                    <span className="font-bold text-success">{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-success to-emerald-400 transition-all duration-700"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total', value: taskStats.total, color: 'text-text-primary' },
                    { label: 'Pending', value: taskStats.pending, color: 'text-warning' },
                    { label: 'In Progress', value: taskStats.in_progress, color: 'text-accent' },
                    { label: 'Completed', value: taskStats.completed, color: 'text-success' },
                    { label: 'Overdue', value: taskStats.overdue, color: 'text-error' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-xl p-3">
                      <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-text-secondary">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-text-secondary text-sm font-semibold">
                <Users className="w-4 h-4" /> Members ({committee.members?.length || 0})
              </div>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin">
                {(committee.members || []).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center text-xs font-bold text-text-primary flex-shrink-0">
                      {member.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{member.name}</p>
                      <p className="text-xs text-text-secondary truncate">{member.email}</p>
                    </div>
                    <span className="text-xs font-medium capitalize text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                      {member.role === 'committee_leader' ? 'Leader' : 'Member'}
                    </span>
                  </div>
                ))}
                {(!committee.members || committee.members.length === 0) && (
                  <p className="text-sm text-text-secondary text-center py-4">No members assigned.</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-text-secondary pt-2 border-t border-white/5">
              <Calendar className="w-3.5 h-3.5" />
              Created {new Date(committee.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            No committee selected.
          </div>
        )}
      </div>
    </div>
  );
}
