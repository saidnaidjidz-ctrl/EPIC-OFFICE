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
    trendType === 'success' ? 'text-[#1E7B6C] bg-[#45CBB4]/15 border border-[#45CBB4]/30' :
    trendType === 'warning' ? 'text-[#B25622] bg-[#F49A67]/15 border border-[#F49A67]/30' :
    'text-[#173B47] bg-[#2DC5D9]/15 border border-[#2DC5D9]/30';

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ y: -3 }}
      className="card p-5 flex flex-col justify-between gap-3 relative overflow-hidden group bg-white border border-[#CFE8ED] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 z-10">
          <span className="text-xs font-semibold text-[#66858F] font-cairo">{title}</span>
          <span className="text-3xl font-extrabold text-[#173B47] tracking-tight mt-1 font-jakarta">{value}</span>
        </div>
        <div className="p-3 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED] text-[#2DC5D9] group-hover:bg-[#2DC5D9]/15 group-hover:text-[#173B47] transition-all duration-300 z-10">
          {icon}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 z-10 text-xs">
        {trend && (
          <span className={`px-2 py-0.5 rounded-full font-medium font-jakarta ${trendColorClass}`}>
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard 
          title="إجمالي الأعضاء"
          value={d.users?.total || 0}
          icon={<Users className="w-5 h-5" />}
          badge={
            pendingCount > 0 ? (
              <span className="badge bg-[#F49A67]/20 text-[#B25622] border border-[#F49A67]/40 text-xs">
                {pendingCount} بانتظار الاعتماد
              </span>
            ) : (
              <span className="badge bg-[#45CBB4]/20 text-[#1E7B6C] border border-[#45CBB4]/40 text-xs">الكل معتمد</span>
            )
          }
        />
        <StatCard 
          title="المهام النشطة"
          value={(d.tasks?.pending || 0) + (d.tasks?.in_progress || 0)}
          icon={<CheckSquare className="w-5 h-5" />}
          trend={`${d.tasks?.completion_rate || 0}% إنجاز`}
          trendType={d.tasks?.completion_rate && d.tasks.completion_rate > 70 ? 'success' : 'info'}
        />
        <StatCard 
          title="إجمالي اللجان"
          value={d.committees?.total || 0}
          icon={<FolderKanban className="w-5 h-5" />}
          trend="نشطة بالكامل"
        />
        <StatCard 
          title="اجتماعات الأسبوع"
          value={d.meetings?.upcoming_count || 0}
          icon={<CalendarDays className="w-5 h-5" />}
          trend={`${d.meetings?.this_week || 0} هذا الأسبوع`}
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard 
          title="أعضاء اللجنة"
          value={d.members?.total || 0}
          icon={<Users className="w-5 h-5" />}
          badge={
            <span className="badge bg-[#2DC5D9]/20 text-[#173B47] border border-[#2DC5D9]/40 text-xs">
              {d.members?.active || 0} عضو نشط
            </span>
          }
        />
        <StatCard 
          title="إجمالي المهام"
          value={d.tasks?.total || 0}
          icon={<CheckSquare className="w-5 h-5" />}
          badge={
            <span className="badge bg-[#38C9D8]/20 text-[#173B47] border border-[#38C9D8]/40 text-xs">
              {d.tasks?.in_progress || 0} قيد التنفيذ
            </span>
          }
        />
        <StatCard 
          title="نسبة الإنجاز العامة"
          value={`${d.tasks?.completion_rate || 0}%`}
          icon={<Percent className="w-5 h-5" />}
          trend={`${d.tasks?.completed || 0} مكتملة`}
          trendType="success"
        />
        <StatCard 
          title="الاجتماعات القادمة"
          value={d.upcoming_meetings?.length || 0}
          icon={<CalendarDays className="w-5 h-5" />}
          trend="خلال 7 أيام"
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      <StatCard 
        title="مهام قيد الانتظار"
        value={pendingCount}
        icon={<Clock className="w-5 h-5" />}
        badge={
          overdueCount > 0 ? (
            <span className="badge bg-[#F18368]/20 text-[#B83E22] border border-[#F18368]/40 text-xs">
              {overdueCount} متأخرة
            </span>
          ) : (
            <span className="badge bg-[#45CBB4]/20 text-[#1E7B6C] border border-[#45CBB4]/40 text-xs">في الموعد</span>
          )
        }
      />
      <StatCard 
        title="مهام قيد التنفيذ"
        value={inProgressCount}
        icon={<CheckSquare className="w-5 h-5" />}
      />
      <StatCard 
        title="نسبة إنجازي"
        value={`${myCompletionRate}%`}
        icon={<TrendingUp className="w-5 h-5" />}
        trend={`${totalCompleted} مكتملة`}
        trendType="success"
      />
      <StatCard 
        title="تنبيهات غير مقروءة"
        value={d.recent_notifications?.filter(n => !n.is_read).length || 0}
        icon={<Bell className="w-5 h-5" />}
        badge={
          <span className="badge bg-[#2DC5D9]/20 text-[#173B47] border border-[#2DC5D9]/40 text-xs">
            نشاط جديد
          </span>
        }
      />
    </motion.div>
  );
}
