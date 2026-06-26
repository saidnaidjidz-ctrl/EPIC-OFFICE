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
    { name: 'Completed', value: tasks.completed, color: '#10B981' },
    { name: 'In Progress', value: tasks.in_progress, color: '#06B6D4' },
    { name: 'Pending', value: tasks.pending, color: '#7C3AED' },
  ];

  if (tasks.overdue !== undefined && tasks.overdue > 0) {
    data.push({ name: 'Overdue', value: tasks.overdue, color: '#EF4444' });
  }

  // Filter out any zero value items to avoid rendering empty slices
  const filteredData = data.filter((d) => d.value > 0);

  const totalTasks = filteredData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="card-glass p-6 flex flex-col gap-6 h-full min-h-[350px]">
      <div className="flex flex-col gap-1 border-b border-border/50 pb-4">
        <h3 className="text-lg font-bold text-text-primary">Tasks Status Breakdown</h3>
        <p className="text-xs text-text-secondary">Summary of tasks execution status</p>
      </div>

      {totalTasks === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-secondary mb-4 font-semibold text-lg">
            0
          </div>
          <span className="text-sm font-medium text-text-secondary">No tasks available</span>
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
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1E293B" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-surface border border-border px-3 py-2 rounded-lg text-xs shadow-xl">
                          <p className="font-semibold" style={{ color: data.color }}>
                            {data.name}: {data.value}
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
              <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                {totalTasks}
              </span>
              <span className="text-2xs text-text-secondary uppercase tracking-wider font-semibold">
                Tasks
              </span>
            </div>
          </div>

          {/* Legends */}
          <div className="flex flex-col gap-3 flex-grow justify-center w-full">
            {filteredData.map((item, index) => {
              const pct = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl bg-surface-2/40 border border-border/30 hover:border-border/80 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-text-primary">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-text-primary">{item.value}</span>
                    <span className="text-xs text-text-secondary w-10 text-right">{pct}%</span>
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
