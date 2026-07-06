'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { Committee, Task } from '@/types';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckSquare, 
  FolderKanban, 
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// ─── Skeletons ────────────────────────────────────────────────────────────────

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
        <div className="card-glass p-6 h-64 skeleton" />
        <div className="card-glass p-6 h-64 skeleton" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuthStore();

  // Queries
  const { data: statsData, isLoading: isStatsLoading, error: statsError, refetch } = useQuery({
    queryKey: ['dashboard-stats-analytics'],
    queryFn: () => apiClient.get<any>('/dashboard/stats'),
    enabled: !!user,
  });

  const { data: committeesRes } = useQuery({
    queryKey: ['committees-list-analytics'],
    queryFn: () => apiClient.get<{ success: boolean; count: number; committees: Committee[] }>('/committees'),
    enabled: !!user && user.role === 'president',
  });

  const { data: tasksRes } = useQuery({
    queryKey: ['analytics-tasks-list'],
    queryFn: () => apiClient.get<{ success: boolean; tasks: Task[] }>('/tasks?limit=100'),
    enabled: !!user,
  });

  // Calculate Metrics
  const stats = React.useMemo(() => {
    if (!statsData) return [];

    const isPresident = user?.role === 'president';
    const totalMembers = isPresident ? statsData.users?.total ?? 0 : statsData.members?.total ?? 0;
    const completedTasks = statsData.tasks?.completed ?? 0;
    const completionRate = statsData.tasks?.completion_rate ?? 0;
    const activeUnits = isPresident ? statsData.committees?.total ?? 0 : statsData.members?.active ?? 0;
    const overdueTasks = statsData.tasks?.overdue ?? 0;

    return [
      { 
        label: isPresident ? 'Total Members' : 'Committee Members', 
        value: String(totalMembers), 
        change: isPresident ? `${statsData.users?.approved ?? 0} approved members` : `${statsData.members?.active ?? 0} active members`, 
        icon: <Users className="w-5 h-5" />, 
        color: 'text-secondary', 
        bg: 'bg-secondary/10 border-secondary/20 shadow-glow-cyan/5' 
      },
      { 
        label: 'Tasks Completed', 
        value: String(completedTasks), 
        change: `${completionRate}% completion rate`, 
        icon: <CheckSquare className="w-5 h-5" />, 
        color: 'text-success', 
        bg: 'bg-success/10 border-success/20 shadow-glow-success/5' 
      },
      { 
        label: isPresident ? 'Active Committees' : 'Active Members', 
        value: String(activeUnits), 
        change: isPresident ? (statsData.committees?.most_active ? `Top: ${statsData.committees.most_active}` : 'All committees active') : 'Actively participating', 
        icon: <FolderKanban className="w-5 h-5" />, 
        color: 'text-accent', 
        bg: 'bg-accent/10 border-accent/20 shadow-glow-purple/5' 
      },
      { 
        label: 'Overdue Tasks', 
        value: String(overdueTasks), 
        change: `${statsData.tasks?.pending ?? 0} pending tasks`, 
        icon: <Clock className="w-5 h-5" />, 
        color: overdueTasks > 0 ? 'text-error animate-pulse-slow' : 'text-warning', 
        bg: overdueTasks > 0 ? 'bg-error/10 border-error/20' : 'bg-warning/10 border-warning/20' 
      },
    ];
  }, [statsData, user]);

  // Calculate Committee Performance
  const committeePerf = React.useMemo(() => {
    const list = committeesRes?.committees || [];
    return list.map((c, i) => {
      const taskTotal = Number(c.task_total) || 0;
      const taskCompleted = Number(c.task_completed) || 0;
      const rate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;
      const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'];
      return {
        name: c.name,
        completion: rate,
        tasks: taskTotal,
        color: colors[i % colors.length],
      };
    });
  }, [committeesRes]);

  // Calculate Leader Member Performance
  const leaderMemberPerf = React.useMemo(() => {
    if (user?.role !== 'committee_leader' || !statsData) return [];
    const list = statsData.member_performance || [];
    return list.map((m: any, i: number) => {
      const taskTotal = Number(m.tasks_total) || 0;
      const taskCompleted = Number(m.tasks_completed) || 0;
      const rate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;
      const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'];
      return {
        name: m.name,
        completion: rate,
        tasks: taskTotal,
        color: colors[i % colors.length],
      };
    });
  }, [statsData, user]);

  // Calculate Completion Trend
  const completionTrend = React.useMemo(() => {
    const list = tasksRes?.tasks || [];
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

    const today = new Date();
    const currentDay = today.getDay(); 
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + mondayDiff);
    startOfWeek.setHours(0, 0, 0, 0);

    list.forEach((t) => {
      if (t.status === 'completed' && t.completed_at) {
        const compDate = new Date(t.completed_at);
        if (compDate >= startOfWeek) {
          const day = compDate.getDay(); 
          const index = day === 0 ? 6 : day - 1;
          if (index >= 0 && index < 7) {
            counts[index]++;
          }
        }
      }
    });

    const maxVal = Math.max(...counts, 1);
    return counts.map((count, i) => ({
      count,
      percentage: (count / maxVal) * 100,
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
    }));
  }, [tasksRes]);

  if (isStatsLoading) return <AnalyticsSkeleton />;

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-text-primary">Failed to Load Analytics</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            We couldn&apos;t build the charts. Please verify your connection and try again.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const isPresident = user?.role === 'president';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-text-primary flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-secondary" /> Analytics
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {isPresident ? 'Club-wide aggregate performance metrics' : 'Committee performance insights'}
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`card-glass p-4 border border-white/5 flex flex-col gap-3`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.color} ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary tracking-tight">{stat.value}</p>
              <p className="text-xs font-semibold text-text-secondary mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-text-secondary/70 mt-1 leading-normal">{stat.change}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-glass p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary" />
            <h2 className="font-bold text-text-primary">
              {isPresident ? 'Committee Performance' : 'Member Performance'}
            </h2>
          </div>
          
          <div className="space-y-5 overflow-y-auto max-h-60 pr-1">
            {isPresident && committeePerf.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-8">No committee performance metrics yet.</p>
            )}
            {!isPresident && leaderMemberPerf.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-8">No member performance statistics found.</p>
            )}
            
            {(isPresident ? committeePerf : leaderMemberPerf).map((item, i) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-text-primary truncate max-w-[180px]">{item.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-text-secondary">{item.tasks} task{item.tasks !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.completion}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 border border-white/5 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.completion}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Completion Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-glass p-6 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-bold text-text-primary">Task Completion Trend (This Week)</h2>
          </div>
          
          <div className="flex items-end gap-3 h-36">
            {completionTrend.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                {day.count > 0 && (
                  <span className="text-[10px] font-bold text-text-primary select-none mb-1">
                    {day.count}
                  </span>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${day.percentage}%` }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-secondary via-secondary to-accent shadow-glow-cyan/5"
                  style={{ minHeight: 4 }}
                />
                <span className="text-[10px] font-bold text-text-secondary select-none">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
