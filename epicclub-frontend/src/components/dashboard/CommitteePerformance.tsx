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
      <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full min-h-[350px]">
        <div className="flex justify-between items-start border-b border-[#CFE8ED] pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">توزيع أعضاء اللجان</h3>
            <p className="text-xs text-[#66858F]">توزيع الأعضاء المعتمدين على مختلف لجان النادي</p>
          </div>
          <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED] text-[#2DC5D9]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#66858F] text-sm font-medium">
            لا توجد بيانات توزيع للجان حالياً
          </div>
        ) : (
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#66858F" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#66858F" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(45, 197, 217, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-white border border-[#CFE8ED] px-3.5 py-2.5 rounded-xl text-xs shadow-lg font-cairo">
                          <p className="font-bold text-[#173B47] mb-1">{data.name}</p>
                          <p className="text-[#2DC5D9] font-bold font-jakarta">{data.count} عضو</p>
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
                      fill={index === 0 ? '#2DC5D9' : index === 1 ? '#38C9D8' : '#7F91FF'} 
                      className="transition-all duration-300 hover:opacity-85"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick highlight cards */}
        <div className="grid grid-cols-2 gap-3.5 mt-1">
          <div className="p-3 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED]">
            <span className="text-[10px] text-[#66858F] font-semibold uppercase tracking-wider block">الأكثر نشاطاً</span>
            <span className="text-xs md:text-sm font-bold text-[#173B47] mt-1 block truncate">
              {d.committees?.most_active || 'غير محدد'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED]">
            <span className="text-[10px] text-[#66858F] font-semibold uppercase tracking-wider block">الأقل نشاطاً</span>
            <span className="text-xs md:text-sm font-bold text-[#173B47] mt-1 block truncate">
              {d.committees?.least_active || 'غير محدد'}
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
    <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full min-h-[350px]">
      <div className="flex justify-between items-start border-b border-[#CFE8ED] pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">أداء أعضاء اللجنة</h3>
          <p className="text-xs text-[#66858F]">إحصائيات إنجاز المهام لكل عضو في اللجنة</p>
        </div>
        <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED] text-[#2DC5D9]">
          <Award className="w-5 h-5" />
        </div>
      </div>

      {performance.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#66858F] text-sm font-medium">
          لم يتم تسجيل مهام للأعضاء بعد
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto max-h-[380px] hide-scrollbar pl-1">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-[#CFE8ED] text-[11px] font-bold text-[#66858F] uppercase tracking-wider">
                <th className="py-2.5 pb-3">العضو</th>
                <th className="py-2.5 pb-3 text-center">المكتملة</th>
                <th className="py-2.5 pb-3 text-center">الإجمالي</th>
                <th className="py-2.5 pb-3 text-left">نسبة الإنجاز</th>
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
                    className="border-b border-[#CFE8ED]/60 text-xs hover:bg-[#F0F8FA] transition-colors duration-150"
                  >
                    <td className="py-3 pl-2 font-semibold text-[#173B47] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#F0F8FA] border border-[#CFE8ED] flex items-center justify-center text-[10px] font-bold text-[#66858F] font-jakarta">
                        {index + 1}
                      </span>
                      <span className="truncate max-w-[140px]">{member.name}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-[#1E7B6C] font-jakarta">
                        <CheckCircle className="w-3.5 h-3.5 text-[#45CBB4]" />
                        {completed}
                      </span>
                    </td>
                    <td className="py-3 text-center text-[#66858F]">
                      <span className="inline-flex items-center gap-1 font-semibold font-jakarta">
                        <Target className="w-3.5 h-3.5 opacity-60" />
                        {total}
                      </span>
                    </td>
                    <td className="py-3 text-left font-bold text-[#2DC5D9] font-jakarta">
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
