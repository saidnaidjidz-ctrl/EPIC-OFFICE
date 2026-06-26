'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Pencil, 
  Trash2, 
  Clock,
  User,
  ChevronRight 
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, UserRole } from '@/types';
import { getPriorityStyle } from './TaskCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusStyle(status: TaskStatus) {
  switch (status) {
    case 'pending':     return 'bg-warning/20 text-warning border border-warning/30';
    case 'in_progress': return 'bg-accent/20 text-accent border border-accent/30';
    case 'completed':   return 'bg-success/20 text-success border border-success/30';
    case 'cancelled':   return 'bg-surface-2 text-text-secondary border border-border';
    default:            return 'bg-surface-2 text-text-secondary border border-border';
  }
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date();
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Sort State ────────────────────────────────────────────────────────────────

type SortKey = 'title' | 'priority' | 'status' | 'due_date' | 'committee';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<TaskStatus, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };

function sortTasks(tasks: Task[], key: SortKey, dir: SortDir): Task[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'title':     cmp = a.title.localeCompare(b.title); break;
      case 'priority':  cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
      case 'status':    cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case 'due_date':  cmp = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'); break;
      case 'committee': cmp = (a.committee?.name ?? '').localeCompare(b.committee?.name ?? ''); break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ─── SortHeader helper ─────────────────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer select-none hover:text-text-primary transition-colors duration-150 group"
    >
      <div className="flex items-center gap-1.5">
        {label}
        <span className={`transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isActive ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
        </span>
      </div>
    </th>
  );
}

// ─── TasksTable Props ─────────────────────────────────────────────────────────

interface TasksTableProps {
  tasks: Task[];
  userRole: UserRole;
  userId: string;
  onTaskClick: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

// ─── TasksTable ───────────────────────────────────────────────────────────────

export default function TasksTable({ tasks, userRole, userId, onTaskClick, onEdit, onDelete }: TasksTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = sortTasks(tasks, sortKey, sortDir);
  const canManage = userRole === 'president' || userRole === 'committee_leader';

  return (
    <div className="table-container overflow-hidden rounded-2xl border border-border">
      <table className="table w-full">
        <thead>
          <tr className="bg-surface-2/80">
            <SortHeader label="Title"      sortKey="title"      activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Assignee</th>
            <SortHeader label="Committee"  sortKey="committee"  activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Priority"   sortKey="priority"   activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Status"     sortKey="status"     activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortHeader label="Due Date"   sortKey="due_date"   activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-sm text-text-secondary">
                No tasks match your filters.
              </td>
            </tr>
          ) : (
            sorted.map((task) => {
              const overdue = isOverdue(task.due_date, task.status);
              const canEdit = canManage;
              const canDelete = canManage;

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`cursor-pointer transition-colors duration-150 hover:bg-surface-2/50 group ${
                    overdue ? 'border-l-2 border-l-error' : ''
                  }`}
                >
                  {/* Title */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors duration-150">
                          {task.title}
                        </span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-2xs text-error font-semibold mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm w-7 h-7 text-2xs flex-shrink-0">
                          {task.assignee.avatar_url ? (
                            <Image src={task.assignee.avatar_url} alt={task.assignee.name} width={28} height={28} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span>{getInitials(task.assignee.name)}</span>
                          )}
                        </div>
                        <span className="text-xs text-text-primary truncate max-w-[100px]">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <User className="w-3.5 h-3.5" />
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Committee */}
                  <td className="px-4 py-3">
                    {task.committee ? (
                      <span className="badge badge-primary text-2xs truncate max-w-[100px]">
                        {task.committee.name}
                      </span>
                    ) : <span className="text-text-secondary text-xs">—</span>}
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span className={`badge text-2xs font-bold ${getPriorityStyle(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`badge text-2xs font-semibold ${getStatusStyle(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${overdue ? 'text-error' : 'text-text-secondary'}`}>
                      {formatDate(task.due_date)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {canEdit && (
                        <button
                          onClick={() => onEdit(task)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-all duration-150"
                          title="Edit task"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(task)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all duration-150"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
