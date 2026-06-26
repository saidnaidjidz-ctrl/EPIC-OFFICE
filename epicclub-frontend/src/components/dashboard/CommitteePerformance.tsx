'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Award, Users, CheckCircle, Target } from 'lucide-react';
import type { PresidentDashboard, LeaderDashboard, UserRole } from '@/types';

interface CommitteePerformanceProps {
  role: UserRole;
  data: PresidentDashboard | LeaderDashboard;
}

export default function CommitteePerformance({ role, data }: CommitteePerformanceProps) {
  const isPresident = role === 'president';

  if (isPresident) {
    // ─── President View: Users by Committee ──────────────────────────────────
    const d = data as PresidentDashboard;
    const byCommittee = d.users?.by_committee || {};
    
    const chartData = Object.entries(byCommittee).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    return (
      <div className="card-glass p-6 flex flex-col gap-6 h-full min-h-[350px]">
        <div className="flex justify-between items-start border-b border-border/50 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-text-primary">Committee Allocation</h3>
            <p className="text-xs text-text-secondary">Distribution of approved members across committees</p>
          </div>
          <Users className="w-5 h-5 text-text-secondary opacity-60" />
        </div>

        {chartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            No committee allocation data
          </div>
        ) : (
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#94A3B8" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94A3B8" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-surface border border-border px-3 py-2 rounded-lg text-xs shadow-xl">
                          <p className="font-semibold text-text-primary mb-1">{data.name}</p>
                          <p className="text-accent">{data.count} Members</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#7C3AED' : '#1E3A5F'} 
                      className="transition-all duration-300 hover:opacity-85"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick highlight cards */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-3 rounded-xl bg-surface-2/40 border border-border/30">
            <span className="text-2xs text-text-secondary font-medium uppercase tracking-wider block">Most Active</span>
            <span className="text-sm font-bold text-text-primary mt-1 block truncate">
              {d.committees?.most_active || 'N/A'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-2/40 border border-border/30">
            <span className="text-2xs text-text-secondary font-medium uppercase tracking-wider block">Least Active</span>
            <span className="text-sm font-bold text-text-primary mt-1 block truncate">
              {d.committees?.least_active || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Committee Leader View: Member Performance ─────────────────────────────
  const d = data as LeaderDashboard;
  const performance = d.member_performance || [];

  return (
    <div className="card-glass p-6 flex flex-col gap-6 h-full min-h-[350px]">
      <div className="flex justify-between items-start border-b border-border/50 pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-text-primary">Member Performance</h3>
          <p className="text-xs text-text-secondary">Task completion stats for committee members</p>
        </div>
        <Award className="w-5 h-5 text-text-secondary opacity-60" />
      </div>

      {performance.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          No team members registered yet
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto max-h-[380px] hide-scrollbar pr-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-2xs font-semibold text-text-secondary uppercase tracking-wider">
                <th className="py-2 pb-3">Name</th>
                <th className="py-2 pb-3 text-center">Completed</th>
                <th className="py-2 pb-3 text-center">Total</th>
                <th className="py-2 pb-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((member, index) => {
                const total = member.tasks_total || 0;
                const completed = member.tasks_completed || 0;
                const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                return (
                  <tr 
                    key={member.user_id} 
                    className="border-b border-border/20 text-xs hover:bg-surface-2/30 transition-colors duration-150"
                  >
                    <td className="py-3 pr-2 font-medium text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-2xs font-bold text-text-secondary">
                        {index + 1}
                      </span>
                      <span className="truncate max-w-[120px]">{member.name}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <CheckCircle className="w-3 h-3" />
                        {completed}
                      </span>
                    </td>
                    <td className="py-3 text-center text-text-secondary">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Target className="w-3 h-3 opacity-60" />
                        {total}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-accent">
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
