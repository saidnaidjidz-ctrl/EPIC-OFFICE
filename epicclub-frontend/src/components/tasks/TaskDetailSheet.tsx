'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { X, Clock, Calendar, User, FolderKanban, FileText, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Task, ApiResponse, TaskStatus } from '@/types';
import { getPriorityStyle } from './TaskCard';
import DOMPurify from 'dompurify';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_ACTIONS: { from: TaskStatus[]; to: TaskStatus; label: string; style: string }[] = [
  { from: ['pending'], to: 'in_progress', label: 'Start Task', style: 'btn-accent' },
  { from: ['in_progress'], to: 'completed', label: 'Mark Complete', style: 'btn-primary' },
  { from: ['in_progress', 'pending'], to: 'cancelled', label: 'Cancel', style: 'btn-danger' },
  { from: ['cancelled', 'completed'], to: 'pending', label: 'Reopen', style: 'btn-ghost' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export default function TaskDetailSheet({ task, onClose, onEdit, onDelete }: TaskDetailSheetProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const canManage = user?.role === 'president' || user?.role === 'committee_leader';
  const isAssignee = task?.assigned_to === user?.id;
  const canEdit = canManage || isAssignee;
  const canDelete = canManage;

  const overdue = task ? isOverdue(task.due_date, task.status) : false;

  // Sanitize before rendering
  const safeDescription = useMemo(() => {
    if (!task?.description) return '';
    if (typeof window === 'undefined') return task.description;
    return DOMPurify.sanitize(task.description, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }, [task?.description]);

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const availableActions = useMemo(() => {
    if (!task) return [];
    let actions = STATUS_ACTIONS.filter(a => a.from.includes(task.status));
    if (user?.role === 'member') {
      actions = actions.filter(a => a.to === 'in_progress' || a.to === 'completed');
    }
    return actions;
  }, [task, user?.role]);

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className={`badge text-2xs font-bold ${getPriorityStyle(task.priority)}`}>
                  {task.priority.toUpperCase()}
                </span>
                {overdue && (
                  <span className="flex items-center gap-1 text-2xs text-error font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    OVERDUE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={() => onEdit(task)}
                    className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-all duration-150"
                    title="Edit task"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(task)}
                    className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all duration-150"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-150 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 hide-scrollbar">
              {/* Title */}
              <h2 className="text-xl font-bold text-text-primary leading-snug">
                {task.title}
              </h2>

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${
                  task.status === 'completed' ? 'text-success' :
                  task.status === 'in_progress' ? 'text-accent' : 'text-text-secondary'
                }`} />
                <span className="text-sm font-semibold text-text-primary">
                  {STATUS_LABELS[task.status]}
                </span>
              </div>

              {/* Description */}
              {safeDescription ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5" />
                    Description
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed bg-surface-2/30 rounded-xl px-4 py-3 border border-border/30">
                    {safeDescription}
                  </p>
                </div>
              ) : null}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assignee */}
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-2/30 border border-border/30">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider">
                    <User className="w-3 h-3" />
                    Assignee
                  </div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="avatar avatar-sm w-7 h-7 text-2xs">
                        {task.assignee.avatar_url ? (
                          <Image src={task.assignee.avatar_url} alt={task.assignee.name} width={28} height={28} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span>{getInitials(task.assignee.name)}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-text-primary truncate">
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-secondary mt-1">Unassigned</span>
                  )}
                </div>

                {/* Committee */}
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-2/30 border border-border/30">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider">
                    <FolderKanban className="w-3 h-3" />
                    Committee
                  </div>
                  <span className="text-xs font-semibold text-text-primary mt-1 truncate">
                    {task.committee?.name || '—'}
                  </span>
                </div>

                {/* Due Date */}
                <div className={`flex flex-col gap-2 p-3 rounded-xl border ${
                  overdue ? 'bg-error/10 border-error/30' : 'bg-surface-2/30 border-border/30'
                }`}>
                  <div className={`flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider ${overdue ? 'text-error' : 'text-text-secondary'}`}>
                    <Calendar className="w-3 h-3" />
                    Due Date
                  </div>
                  <span className={`text-xs font-semibold mt-1 ${overdue ? 'text-error' : 'text-text-primary'}`}>
                    {formatDate(task.due_date)}
                  </span>
                </div>

                {/* Created */}
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-2/30 border border-border/30">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold text-text-secondary uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    Created
                  </div>
                  <span className="text-xs font-semibold text-text-primary mt-1">
                    {formatDate(task.created_at)}
                  </span>
                </div>
              </div>

              {/* Completion timestamp */}
              {task.completed_at && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/30">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-xs text-success font-medium">
                    Completed on {formatDate(task.completed_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Status Actions footer */}
            {(canEdit || isAssignee) && availableActions.length > 0 && (
              <div className="flex flex-col gap-2 px-6 py-4 border-t border-border/50 flex-shrink-0">
                <p className="text-2xs text-text-secondary font-semibold uppercase tracking-wider mb-1">
                  Update Status
                </p>
                {statusMutation.isError && (
                  <p className="text-2xs text-error">Failed to update status.</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {availableActions.map(action => (
                    <button
                      key={action.to}
                      onClick={() => statusMutation.mutate({ taskId: task.id, status: action.to })}
                      disabled={statusMutation.isPending}
                      className={`${action.style} text-xs py-2 flex-1`}
                    >
                      {statusMutation.isPending ? <span className="spinner spinner-sm" /> : action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
