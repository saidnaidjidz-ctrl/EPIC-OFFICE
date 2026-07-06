'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { Task } from '@/types';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckSquare,
  FolderKanban,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PresidentStats {
  users: { total: number; pending: number; approved: number; by_committee: Record<string, number> };
  tasks: { total: number; pending: number; in_progress: number; completed: number; overdue: number; completion_rate: number };
  committees: { total: number; most_active: string | null; least_active: string | null };
  meetings: { upcoming_count: number; this_week: number };
}

interface LeaderStats {
  members: { total: number; active: number };
  tasks: { total: number; pending: number; in_progress: number; completed: number; overdue: number; completion_rate: number };
  member_performance: { user_id: string; name: string; tasks_total: number; tasks_completed: number }[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-5 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-glass p-4 flex flex-col gap-3">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="skeleton h-7 w-12" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-glass p-6 space-y-4">
          <div className="skeleton h-5 w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="card-glass p-6 h-64 flex flex-col gap-4">
          <div className="skeleton h-5 w-48" />
          <div className="flex items-end gap-3 h-36 mt-auto">
            {[1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="skeleton w-full rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="skeleton h-3 w-3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const isPresident = user?.role === 'president';
  const isLeader = user?.role === 'committee_leader';

  // ── Fetch dashboard stats (role-scoped from backend) ──
  const { data: statsRaw, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => apiClient.get<any>('/dashboard/stats'),
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Fetch completed tasks this week for the trend chart ──
  const { data: tasksRaw } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: () => apiClient.get<{ success: boolean; tasks: Task[]; total: number }>('/tasks', { limit: 200, status: 'completed' }),
    enabled: !!user,
    staleTime: 60_000,
  });

  // ── Build stat cards ──
  const statCards = React.useMemo(() => {
    const s = statsRaw;
    if (!s) return [];

    if (isPresident) {
      const ps = s as PresidentStats;
      return [
        {
          label: 'Total Members',
          value: ps.users?.total ?? 0,
          change: `${ps.users?.approved ?? 0} approved · ${ps.users?.pending ?? 0} pending`,
          icon: <Users className="w-5 h-5" />,
          color: 'text-secondary',
          bg: 'bg-secondary/10 border-secondary/20',
        },
        {
          label: 'Tasks Completed',
          value: ps.tasks?.completed ?? 0,
          change: `${ps.tasks?.completion_rate ?? 0}% completion rate`,
          icon: <CheckSquare className="w-5 h-5" />,
          color: 'text-success',
          bg: 'bg-success/10 border-success/20',
        },
        {
          label: 'Active Committees',
          value: ps.committees?.total ?? 0,
          change: ps.committees?.most_active ? `Top: ${ps.committees.most_active}` : 'No committees yet',
          icon: <FolderKanban className="w-5 h-5" />,
          color: 'text-accent',
          bg: 'bg-accent/10 border-accent/20',
        },
        {
          label: 'Overdue Tasks',
          value: ps.tasks?.overdue ?? 0,
          change: `${ps.tasks?.in_progress ?? 0} in progress · ${ps.tasks?.pending ?? 0} pending`,
          icon: <Clock className="w-5 h-5" />,
          color: (ps.tasks?.overdue ?? 0) > 0 ? 'text-error' : 'text-warning',
          bg: (ps.tasks?.overdue ?? 0) > 0 ? 'bg-error/10 border-error/20' : 'bg-warning/10 border-warning/20',
        },
      ];
    }

    const ls = s as LeaderStats;
    return [
      {
        label: 'Committee Members',
        value: ls.members?.total ?? 0,
        change: `${ls.members?.active ?? 0} active members`,
        icon: <Users className="w-5 h-5" />,
        color: 'text-secondary',
        bg: 'bg-secondary/10 border-secondary/20',
      },
      {
        label: 'Tasks Completed',
        value: ls.tasks?.completed ?? 0,
        change: `${ls.tasks?.completion_rate ?? 0}% completion rate`,
        icon: <CheckSquare className="w-5 h-5" />,
        color: 'text-success',
        bg: 'bg-success/10 border-success/20',
      },
      {
        label: 'Total Tasks',
        value: ls.tasks?.total ?? 0,
        change: `${ls.tasks?.in_progress ?? 0} in progress`,
        icon: <FolderKanban className="w-5 h-5" />,
        color: 'text-accent',
        bg: 'bg-accent/10 border-accent/20',
      },
      {
        label: 'Overdue Tasks',
        value: ls.tasks?.overdue ?? 0,
        change: `${ls.tasks?.pending ?? 0} still pending`,
        icon: <Clock className="w-5 h-5" />,
        color: (ls.tasks?.overdue ?? 0) > 0 ? 'text-error' : 'text-warning',
        bg: (ls.tasks?.overdue ?? 0) > 0 ? 'bg-error/10 border-error/20' : 'bg-warning/10 border-warning/20',
      },
    ];
  }, [statsRaw, isPresident]);

  // ── Build performance bars ──
  // President: member count per committee (from by_committee map)
  // Leader: task completion per member
  const perfBars = React.useMemo(() => {
    if (!statsRaw) return [];
    const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#F97316'];

    if (isPresident) {
      const byCommittee: Record<string, number> = (statsRaw as PresidentStats).users?.by_committee ?? {};
      const entries = Object.entries(byCommittee);
      if (entries.length === 0) return [];
      const maxCount = Math.max(...entries.map(([, c]) => c), 1);
      return entries.map(([name, count], i) => ({
        name,
        value: count,
        percentage: Math.round((count / maxCount) * 100),
        subtitle: `${count} member${count !== 1 ? 's' : ''}`,
        color: COLORS[i % COLORS.length],
      }));
    }

    if (isLeader) {
      const perf: { user_id: string; name: string; tasks_total: number; tasks_completed: number }[] =
        (statsRaw as LeaderStats).member_performance ?? [];
      if (perf.length === 0) return [];
      return perf.map((m, i) => {
        const rate = m.tasks_total > 0 ? Math.round((m.tasks_completed / m.tasks_total) * 100) : 0;
        return {
          name: m.name,
          value: rate,
          percentage: rate,
          subtitle: `${m.tasks_completed}/${m.tasks_total} tasks`,
          color: COLORS[i % COLORS.length],
        };
      });
    }

    return [];
  }, [statsRaw, isPresident, isLeader]);

  // ── Build weekly completion trend ──
  const trend = React.useMemo(() => {
    const tasks: Task[] = tasksRaw?.tasks ?? [];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    const today = new Date();
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    tasks.forEach((t) => {
      if (t.status === 'completed' && t.completed_at) {
        const d = new Date(t.completed_at);
        if (d >= monday) {
          const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          if (idx >= 0 && idx < 7) counts[idx]++;
        }
      }
    });

    const max = Math.max(...counts, 1);
    return counts.map((c, i) => ({
      count: c,
      pct: Math.round((c / max) * 100),
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      short: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
    }));
  }, [tasksRaw]);

  // ── Loading & error states ──
  if (isLoading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-text-primary">Failed to Load Analytics</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            We couldn&apos;t connect to the server. Please verify your connection and try again.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-text-primary flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-secondary" />
          Analytics
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {isPresident ? 'Club-wide aggregate performance metrics' : 'Committee performance insights'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card-glass p-4 border border-white/5 flex flex-col gap-3"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.color} ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary tracking-tight">{card.value}</p>
              <p className="text-xs font-semibold text-text-secondary mt-0.5">{card.label}</p>
              <p className="text-[10px] text-text-secondary/70 mt-1 leading-normal">{card.change}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Performance Bars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-glass p-6 flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary" />
            <h2 className="font-bold text-text-primary">
              {isPresident ? 'Members per Committee' : 'Member Performance'}
            </h2>
          </div>

          {perfBars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <FolderKanban className="w-8 h-8 text-text-secondary/40" />
              <p className="text-xs text-text-secondary text-center">
                {isPresident
                  ? 'Create committees and add members to see distribution here.'
                  : 'Assign tasks to members to track performance.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-56 pr-1">
              {perfBars.map((bar, i) => (
                <div key={bar.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-text-primary truncate max-w-[200px]">{bar.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-text-secondary">{bar.subtitle}</span>
                      <span className="text-sm font-bold" style={{ color: bar.color }}>
                        {isLeader ? `${bar.percentage}%` : bar.value}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.percentage}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Weekly Completion Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-bold text-text-primary">Tasks Completed — This Week</h2>
          </div>

          {trend.every((d) => d.count === 0) ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2">
              <TrendingUp className="w-8 h-8 text-text-secondary/40" />
              <p className="text-xs text-text-secondary text-center">
                No tasks completed this week yet. Complete tasks to see the trend.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {trend.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {day.count > 0 && (
                    <span className="text-[10px] font-bold text-text-primary select-none">
                      {day.count}
                    </span>
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(day.pct, day.count > 0 ? 8 : 2)}%` }}
                    transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                    className={`w-full rounded-t-lg ${
                      day.count > 0
                        ? 'bg-gradient-to-t from-secondary to-accent'
                        : 'bg-white/5'
                    }`}
                    style={{ minHeight: 4 }}
                  />
                  <span className="text-[10px] font-semibold text-text-secondary select-none">
                    {day.short}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Summary row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-text-secondary">
            <span>Total this week: <strong className="text-text-primary">{trend.reduce((s, d) => s + d.count, 0)}</strong></span>
            <span>Peak day: <strong className="text-text-primary">{trend.reduce((best, d) => d.count > best.count ? d : best, trend[0]).day}</strong></span>
          </div>
        </motion.div>
      </div>

      {/* Overall Task Breakdown (President only) */}
      {isPresident && statsRaw && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-glass p-6"
        >
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-success" />
            Overall Task Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: (statsRaw as PresidentStats).tasks?.total ?? 0, color: 'text-text-primary', bg: 'bg-white/5' },
              { label: 'Pending', value: (statsRaw as PresidentStats).tasks?.pending ?? 0, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'In Progress', value: (statsRaw as PresidentStats).tasks?.in_progress ?? 0, color: 'text-accent', bg: 'bg-accent/10' },
              { label: 'Completed', value: (statsRaw as PresidentStats).tasks?.completed ?? 0, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Overdue', value: (statsRaw as PresidentStats).tasks?.overdue ?? 0, color: 'text-error', bg: 'bg-error/10' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 text-center ${item.bg}`}>
                <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                <p className="text-xs text-text-secondary mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
