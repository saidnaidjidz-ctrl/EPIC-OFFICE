'use client';

import React from 'react';
import { CheckSquare, X, Filter, ChevronDown } from 'lucide-react';
import type { TaskPriority, TaskStatus, Committee, User } from '@/types';

// ─── Filter State ─────────────────────────────────────────────────────────────

export interface TaskFilterState {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  committee_id: string;
  assignee_id: string;
  due_from: string;
  due_to: string;
}

export const EMPTY_FILTERS: TaskFilterState = {
  statuses: [],
  priorities: [],
  committee_id: '',
  assignee_id: '',
  due_from: '',
  due_to: '',
};

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent/20 text-accent border-accent/30' },
  { value: 'completed', label: 'Completed', color: 'bg-success/20 text-success border-success/30' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-surface-2 text-text-secondary border-border' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-error/20 text-error border-error/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'low', label: 'Low', color: 'bg-success/20 text-success border-success/30' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  committees: Committee[];
  members: Pick<User, 'id' | 'name'>[];
  canFilterByAssignee: boolean;
  activeFilterCount: number;
}

export default function TaskFilters({
  filters,
  onChange,
  committees,
  members,
  canFilterByAssignee,
  activeFilterCount,
}: TaskFiltersProps) {
  const toggleStatus = (status: TaskStatus) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  };

  const togglePriority = (priority: TaskPriority) => {
    const next = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: next });
  };

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <div className="card-glass p-5 flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-text-primary">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-background text-2xs font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-2xs text-text-secondary hover:text-error transition-colors duration-200"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Status multi-select */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Status
        </span>
        <div className="flex flex-col gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const selected = filters.statuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 text-left ${
                  selected
                    ? opt.color
                    : 'bg-surface-2/30 border-border/40 text-text-secondary hover:border-border hover:text-text-primary'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all duration-150 ${
                    selected ? 'bg-current border-current' : 'border-current/30'
                  }`}
                >
                  {selected && <CheckSquare className="w-3 h-3 text-background" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority multi-select */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Priority
        </span>
        <div className="flex flex-col gap-1.5">
          {PRIORITY_OPTIONS.map((opt) => {
            const selected = filters.priorities.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => togglePriority(opt.value)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 text-left ${
                  selected
                    ? opt.color
                    : 'bg-surface-2/30 border-border/40 text-text-secondary hover:border-border hover:text-text-primary'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all duration-150 ${
                    selected ? 'bg-current border-current' : 'border-current/30'
                  }`}
                >
                  {selected && <CheckSquare className="w-3 h-3 text-background" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Committee select */}
      {committees.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Committee
          </span>
          <div className="relative">
            <select
              value={filters.committee_id}
              onChange={(e) => onChange({ ...filters, committee_id: e.target.value, assignee_id: '' })}
              className="input text-xs pr-8 appearance-none"
            >
              <option value="">All Committees</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Assignee select (president/leader only) */}
      {canFilterByAssignee && members.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Assignee
          </span>
          <div className="relative">
            <select
              value={filters.assignee_id}
              onChange={(e) => onChange({ ...filters, assignee_id: e.target.value })}
              className="input text-xs pr-8 appearance-none"
            >
              <option value="">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Due Date Range */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Due Date
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-2xs text-text-secondary">From</label>
            <input
              type="date"
              value={filters.due_from}
              onChange={(e) => onChange({ ...filters, due_from: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-2xs text-text-secondary">To</label>
            <input
              type="date"
              value={filters.due_to}
              onChange={(e) => onChange({ ...filters, due_to: e.target.value })}
              className="input text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
