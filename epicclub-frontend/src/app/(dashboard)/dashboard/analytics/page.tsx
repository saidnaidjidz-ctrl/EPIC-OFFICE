'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, CheckSquare, FolderKanban, Clock } from 'lucide-react';

const stats = [
  { label: 'Total Members', value: '26', change: '+3 this month', icon: <Users className="w-5 h-5" />, color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  { label: 'Tasks Completed', value: '18', change: '72% completion rate', icon: <CheckSquare className="w-5 h-5" />, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  { label: 'Active Committees', value: '3', change: 'All committees active', icon: <FolderKanban className="w-5 h-5" />, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  { label: 'Avg. Task Time', value: '4.2d', change: '-0.8d vs last month', icon: <Clock className="w-5 h-5" />, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
];

const committeePerf = [
  { name: 'Technical Committee', completion: 60, color: '#3B82F6', tasks: 5 },
  { name: 'Social Committee', completion: 50, color: '#F59E0B', tasks: 4 },
  { name: 'Sports & Wellness', completion: 33, color: '#10B981', tasks: 3 },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-secondary mt-0.5">Club performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`card-glass p-4 border ${stat.bg} flex flex-col gap-3`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color} ${stat.bg} border`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-text-primary">{stat.value}</p>
              <p className="text-xs font-semibold text-text-secondary mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-text-secondary/70 mt-1">{stat.change}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-glass p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h2 className="font-bold text-text-primary">Committee Performance</h2>
        </div>
        <div className="space-y-5">
          {committeePerf.map((committee, i) => (
            <div key={committee.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-text-primary">{committee.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">{committee.tasks} tasks</span>
                  <span className="text-sm font-bold" style={{ color: committee.color }}>{committee.completion}%</span>
                </div>
              </div>
              <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${committee.completion}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: committee.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-glass p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="font-bold text-text-primary">Task Completion Trend (This Week)</h2>
        </div>
        <div className="flex items-end gap-3 h-32">
          {[40, 55, 62, 48, 70, 78, 72].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(val / 80) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                className="w-full rounded-t-lg bg-gradient-to-t from-secondary to-accent"
                style={{ minHeight: 4 }}
              />
              <span className="text-[9px] text-text-secondary">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
