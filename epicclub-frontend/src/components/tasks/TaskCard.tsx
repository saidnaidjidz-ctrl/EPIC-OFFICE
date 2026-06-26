'use client';

import React from 'react';
import Image from 'next/image';
import { AlertCircle, Clock, User } from 'lucide-react';
import type { Task } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'urgent': return 'bg-error/20 text-error border border-error/40';
    case 'high':   return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
    case 'medium': return 'bg-warning/20 text-warning border border-warning/40';
    case 'low':    return 'bg-success/20 text-success border border-success/40';
    default:       return 'bg-surface-2 text-text-secondary border border-border';
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate: string) {
  const date = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { label: 'Due today', overdue: false };
  if (diffDays === 1) return { label: 'Due tomorrow', overdue: false };
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
}

// ─── TaskCard Props ────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  draggable?: boolean;
}

// ─── Draggable TaskCard ────────────────────────────────────────────────────────

export default function TaskCard({ task, onClick, draggable = true }: TaskCardProps) {
  const overdue = isOverdue(task.due_date, task.status);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onClick?.(task)}
      className={`group relative bg-surface border rounded-2xl p-4 flex flex-col gap-3 cursor-pointer select-none transition-all duration-200
        hover:shadow-card-hover hover:-translate-y-0.5
        ${overdue ? 'border-error/60 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]' : 'border-border/60 hover:border-border'}
        ${isDragging ? 'shadow-glow cursor-grabbing' : 'cursor-grab'}
      `}
    >
      {/* Priority accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${
        task.priority === 'urgent' ? 'bg-error' :
        task.priority === 'high'   ? 'bg-orange-500' :
        task.priority === 'medium' ? 'bg-warning' : 'bg-success'
      }`} />

      {/* Overdue indicator */}
      {overdue && (
        <div className="flex items-center gap-1.5 text-error text-2xs font-semibold">
          <AlertCircle className="w-3 h-3" />
          OVERDUE
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-accent transition-colors duration-200">
        {task.title}
      </h4>

      {/* Tags row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)}`}>
          {task.priority.toUpperCase()}
        </span>
        {task.committee && (
          <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary-300 border border-primary/30 truncate max-w-[100px]">
            {task.committee.name}
          </span>
        )}
      </div>

      {/* Footer: assignee + due date */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/30">
        {/* Assignee avatar */}
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div className="avatar avatar-sm w-6 h-6 text-2xs ring-1 ring-border flex-shrink-0">
              {task.assignee.avatar_url ? (
                <Image src={task.assignee.avatar_url} alt={task.assignee.name} width={24} height={24} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{getInitials(task.assignee.name)}</span>
              )}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center">
              <User className="w-3 h-3 text-text-secondary" />
            </div>
          )}
          <span className="text-2xs text-text-secondary truncate max-w-[80px]">
            {task.assignee?.name || 'Unassigned'}
          </span>
        </div>

        {/* Due date */}
        {dueDateInfo && (
          <div className={`flex items-center gap-1 text-2xs font-medium ${dueDateInfo.overdue ? 'text-error' : 'text-text-secondary'}`}>
            <Clock className="w-3 h-3" />
            {dueDateInfo.label}
          </div>
        )}
      </div>
    </div>
  );
}
