'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface TasksOverviewProps {
  tasks: {
    total?: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue?: number;
  };
}

export default function TasksOverview({ tasks }: TasksOverviewProps) {
  const data = [
    { name: 'مكتملة', value: tasks.completed, color: '#45CBB4' },
    { name: 'قيد التنفيذ', value: tasks.in_progress, color: '#38C9D8' },
    { name: 'قيد الانتظار', value: tasks.pending, color: '#F49A67' },
  ];

  if (tasks.overdue !== undefined && tasks.overdue > 0) {
    data.push({ name: 'متأخرة', value: tasks.overdue, color: '#F18368' });
  }

  // Filter out any zero value items to avoid rendering empty slices
  const filteredData = data.filter((d) => d.value > 0);

  const totalTasks = filteredData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full min-h-[350px]">
      <div className="flex flex-col gap-1 border-b border-[#CFE8ED] pb-4">
        <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">توزيع حالات المهام</h3>
        <p className="text-xs text-[#66858F]">ملخص حالات سير العمل وإنجاز المهام</p>
      </div>

      {totalTasks === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-[#F0F8FA] border border-[#CFE8ED] flex items-center justify-center text-[#66858F] mb-3 font-bold text-lg font-jakarta">
            0
          </div>
          <span className="text-sm font-medium text-[#66858F]">لا توجد مهام حالياً</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row items-center gap-6 justify-center">
          {/* Chart Container */}
          <div className="relative w-44 h-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-white border border-[#CFE8ED] px-3.5 py-2 rounded-xl text-xs shadow-lg font-cairo">
                          <p className="font-bold" style={{ color: data.color }}>
                            {data.name}: {data.value} مهمة
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Absolute middle label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-[#173B47] tracking-tight font-jakarta">
                {totalTasks}
              </span>
              <span className="text-[10px] text-[#66858F] font-bold font-cairo">
                إجمالي المهام
              </span>
            </div>
          </div>

          {/* Legends */}
          <div className="flex flex-col gap-2.5 flex-grow justify-center w-full">
            {filteredData.map((item, index) => {
              const pct = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED]/60 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-[#173B47]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-jakarta">
                    <span className="font-bold text-[#173B47]">{item.value}</span>
                    <span className="text-[#66858F] text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
