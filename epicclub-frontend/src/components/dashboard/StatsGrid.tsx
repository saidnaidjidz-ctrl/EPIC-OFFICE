'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  CheckSquare, 
  FolderKanban, 
  CalendarDays, 
  TrendingUp, 
  Bell, 
  Percent, 
  Clock 
} from 'lucide-react';
import type { 
  PresidentDashboard, 
  LeaderDashboard, 
  MemberDashboard, 
  UserRole 
} from '@/types';

// ─── Animation Config ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 80 } },
};

// ─── Stat Card Component ──────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'success' | 'warning' | 'info';
  badge?: React.ReactNode;
}

function StatCard({ title, value, icon, trend, trendType = 'info', badge }: StatCardProps) {
  const trendColorClass = 
    trendType === 'success' ? 'text-success bg-success/10' :
    trendType === 'warning' ? 'text-warning bg-warning/10' :
    'text-accent bg-accent/10';

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className="card-glass p-6 flex flex-col gap-4 relative overflow-hidden group"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 z-10">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</span>
          <span className="text-4xl font-extrabold text-text-primary tracking-tight mt-1">{value}</span>
        </div>
        <div className="p-3 rounded-xl bg-surface-2 border border-border text-text-secondary group-hover:text-accent group-hover:border-accent/50 transition-all duration-300 z-10 shadow-inner">
          {icon}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 z-10">
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trendColorClass}`}>
            {trend}
          </span>
        )}
        {badge}
      </div>
    </motion.div>
  );
}

// ─── Scoped Renderers ─────────────────────────────────────────────────────────

interface StatsGridProps {
  role: UserRole;
  data: PresidentDashboard | LeaderDashboard | MemberDashboard;
}

export default function StatsGrid({ role, data }: StatsGridProps) {
  if (role === 'president') {
    const d = data as PresidentDashboard;
    const pendingCount = d.users?.pending || 0;
    
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard 
          title="Total Members"
          value={d.users?.total || 0}
          icon={<Users className="w-6 h-6" />}
          badge={
            pendingCount > 0 ? (
              <span className="badge-warning text-xs font-medium animate-pulse-slow">
                {pendingCount} Pending Approval
              </span>
            ) : (
              <span className="badge-success text-xs font-medium">All approved</span>
            )
          }
        />
        <StatCard 
          title="Active Tasks"
          value={(d.tasks?.pending || 0) + (d.tasks?.in_progress || 0)}
          icon={<CheckSquare className="w-6 h-6" />}
          trend={`${d.tasks?.completion_rate || 0}% Completion`}
          trendType={d.tasks?.completion_rate && d.tasks.completion_rate > 70 ? 'success' : 'info'}
        />
        <StatCard 
          title="Committees"
          value={d.committees?.total || 0}
          icon={<FolderKanban className="w-6 h-6" />}
          trend="Global Sync Active"
        />
        <StatCard 
          title="Upcoming Meetings"
          value={d.meetings?.upcoming_count || 0}
          icon={<CalendarDays className="w-6 h-6" />}
          trend={`This week: ${d.meetings?.this_week || 0}`}
        />
      </motion.div>
    );
  }

  if (role === 'committee_leader') {
    const d = data as LeaderDashboard;
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard 
          title="Committee Members"
          value={d.members?.total || 0}
          icon={<Users className="w-6 h-6" />}
          badge={
            <span className="badge-primary text-xs">
              {d.members?.active || 0} Active
            </span>
          }
        />
        <StatCard 
          title="Total Tasks"
          value={d.tasks?.total || 0}
          icon={<CheckSquare className="w-6 h-6" />}
          badge={
            <span className="badge-accent text-xs">
              {d.tasks?.in_progress || 0} In Progress
            </span>
          }
        />
        <StatCard 
          title="Completion Rate"
          value={`${d.tasks?.completion_rate || 0}%`}
          icon={<Percent className="w-6 h-6" />}
          trend={`${d.tasks?.completed || 0} Done`}
          trendType="success"
        />
        <StatCard 
          title="Upcoming Meetings"
          value={d.upcoming_meetings?.length || 0}
          icon={<CalendarDays className="w-6 h-6" />}
          trend="Next 7 days"
        />
      </motion.div>
    );
  }

  // Member Dashboard Stats
  const d = data as MemberDashboard;
  const overdueCount = d.my_tasks?.overdue || 0;
  const pendingCount = d.my_tasks?.pending || 0;
  const inProgressCount = d.my_tasks?.in_progress || 0;
  const totalCompleted = d.my_tasks?.completed || 0;
  const totalCount = d.my_tasks?.total || (pendingCount + inProgressCount + totalCompleted + overdueCount) || 1;
  const myCompletionRate = Math.round((totalCompleted / totalCount) * 100);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <StatCard 
        title="My Tasks Pending"
        value={pendingCount}
        icon={<Clock className="w-6 h-6 animate-pulse-slow" />}
        badge={
          overdueCount > 0 ? (
            <span className="badge-error text-xs font-semibold">
              {overdueCount} Overdue
            </span>
          ) : (
            <span className="badge-ghost text-xs">No overdue items</span>
          )
        }
      />
      <StatCard 
        title="Tasks in Progress"
        value={inProgressCount}
        icon={<CheckSquare className="w-6 h-6" />}
      />
      <StatCard 
        title="Completion Rate"
        value={`${myCompletionRate}%`}
        icon={<TrendingUp className="w-6 h-6" />}
        trend={`${totalCompleted} Completed`}
        trendType="success"
      />
      <StatCard 
        title="Unread Alerts"
        value={d.recent_notifications?.filter(n => !n.is_read).length || 0}
        icon={<Bell className="w-6 h-6" />}
        badge={
          <span className="badge-primary text-xs">
            Recent activity
          </span>
        }
      />
    </motion.div>
  );
}
