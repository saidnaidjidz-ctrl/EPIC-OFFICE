'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  LayoutGrid,
  ListTodo,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Task, TaskStatus, Committee, User } from '@/types';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TasksTable from '@/components/tasks/TasksTable';
import TaskFilters, { EMPTY_FILTERS, type TaskFilterState } from '@/components/tasks/TaskFilters';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTasksResponse = (rawTasks: any[]): Task[] => {
  return rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || null,
    committee_id: t.committee_id,
    committee: t.committee_id
      ? { id: t.committee_id, name: t.committee_name || 'General' }
      : undefined,
    assigned_to: t.assigned_to,
    assignee: t.assigned_to
      ? {
          id: t.assigned_to,
          name: t.assignee_name || 'Unassigned',
          avatar_url: t.assignee_avatar || null,
        }
      : undefined,
    created_by: t.created_by,
    creator: t.created_by
      ? { id: t.created_by, name: t.creator_name || 'System' }
      : undefined,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    completed_at: t.status === 'completed' ? t.updated_at : null,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // ── View States ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);

  // ── Modal & Sheet States ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeDetailTask, setActiveDetailTask] = useState<Task | null>(null);

  // Determine user permissions
  const canManage = user?.role === 'president' || user?.role === 'committee_leader';
  const canFilterByAssignee = canManage;

  // ── Fetch Committees ──────────────────────────────────────────────────────
  const { data: committeesData } = useQuery({
    queryKey: ['committees-list'],
    queryFn: () => apiClient.get<{ success: boolean; committees: Committee[] }>('/committees'),
    enabled: !!user,
  });
  const committees = committeesData?.committees || [];

  // Determine committee ID for members query
  const targetCommitteeId = useMemo(() => {
    if (user?.role === 'committee_leader') return user.committee_id;
    return filters.committee_id || null;
  }, [user, filters.committee_id]);

  // ── Fetch Members for the Assignee filter dropdown ────────────────────────
  const { data: membersData } = useQuery({
    queryKey: ['committee-members', targetCommitteeId],
    queryFn: () =>
      apiClient.get<{ success: boolean; committee: { members: Pick<User, 'id' | 'name'>[] } }>(
        `/committees/${targetCommitteeId}`
      ),
    enabled: !!targetCommitteeId,
  });
  const members = membersData?.committee?.members || [];

  // ── Fetch Tasks with API-level scopes ─────────────────────────────────────
  const {
    data: tasksData,
    isLoading: tasksLoading,
    isRefetching: tasksRefetching,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['tasks', filters.committee_id, filters.assignee_id],
    queryFn: () =>
      apiClient.get<{ success: boolean; tasks: any[] }>('/tasks', {
        committee_id: filters.committee_id || undefined,
        assigned_to: filters.assignee_id || undefined,
        limit: 50, // Get up to 50 tasks (max allowed limit)
      }),
    enabled: !!user,
  });
  const rawTasks = tasksData?.tasks || [];

  // Format database records to match frontend UI typings
  const formattedTasks = useMemo(() => formatTasksResponse(rawTasks), [rawTasks]);

  // ── Client-side multi-select filter logic ────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = formattedTasks;

    if (filters.statuses.length > 0) {
      list = list.filter((t) => filters.statuses.includes(t.status));
    }
    if (filters.priorities.length > 0) {
      list = list.filter((t) => filters.priorities.includes(t.priority));
    }
    if (filters.due_from) {
      const fromDate = new Date(filters.due_from);
      list = list.filter((t) => t.due_date && new Date(t.due_date) >= fromDate);
    }
    if (filters.due_to) {
      const toDate = new Date(filters.due_to);
      list = list.filter((t) => t.due_date && new Date(t.due_date) <= toDate);
    }

    return list;
  }, [formattedTasks, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.priorities.length > 0) count += filters.priorities.length;
    if (filters.committee_id) count += 1;
    if (filters.assignee_id) count += 1;
    if (filters.due_from) count += 1;
    if (filters.due_to) count += 1;
    return count;
  }, [filters]);

  // ── Move Task Mutation with Optimistic Updates ────────────────────────────
  const moveTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiClient.patch<{ success: boolean; task: any }>(`/tasks/${id}`, { status }),

    onMutate: async ({ id, status }) => {
      // Cancel active refetches to avoid overwrites
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot current cache
      const previousTasks = queryClient.getQueryData<{ success: boolean; tasks: any[] }>([
        'tasks',
        filters.committee_id,
        filters.assignee_id,
      ]);

      // Optimistically update status
      if (previousTasks) {
        queryClient.setQueryData(['tasks', filters.committee_id, filters.assignee_id], {
          ...previousTasks,
          tasks: previousTasks.tasks.map((task) =>
            task.id === id ? { ...task, status, updated_at: new Date().toISOString() } : task
          ),
        });
      }

      return { previousTasks };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', filters.committee_id, filters.assignee_id],
          context.previousTasks
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    moveTaskMutation.mutate({ id: taskId, status: newStatus });
  };

  // ── Delete Task Mutation ──────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setActiveDetailTask(null);
    },
  });

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditTask(null);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ListTodo className="w-8 h-8 text-secondary" />
            Tasks Board
          </h1>
          <p className="page-subtitle">Track, delegate, and manage tasks for Epic Club</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={() => refetchTasks()}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-all duration-200 text-text-secondary hover:text-text-primary"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${(tasksLoading || tasksRefetching) ? 'animate-spin text-accent' : ''}`} />
          </button>

          {/* Toggle view control */}
          <div className="flex bg-surface border border-border p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 ${
                viewMode === 'kanban'
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all duration-150 ${
                viewMode === 'table'
                  ? 'bg-gradient-primary text-white shadow-glow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          {/* Create button */}
          {canManage && (
            <button id="create-task-btn" onClick={handleCreateTask} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <TaskFilters
            filters={filters}
            onChange={setFilters}
            committees={committees}
            members={members}
            canFilterByAssignee={canFilterByAssignee}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Board View Column */}
        <div className="lg:col-span-3 min-h-[600px] relative">
          {(tasksLoading && formattedTasks.length === 0) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-xs rounded-2xl border border-border/50 py-20">
              <div className="spinner spinner-lg" />
              <p className="text-sm text-text-secondary font-medium">Loading tasks list…</p>
            </div>
          ) : formattedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border rounded-2xl py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-2/50 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-text-secondary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-primary">No tasks found</h3>
                <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
                  There are no tasks assigned or matching the current filter constraints.
                </p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  tasks={filteredTasks}
                  onTaskClick={setActiveDetailTask}
                  onTaskMove={handleTaskMove}
                  onCreateTask={handleCreateTask}
                  canCreate={canManage}
                />
              ) : (
                <TasksTable
                  tasks={filteredTasks}
                  userRole={user?.role || 'member'}
                  userId={user?.id || ''}
                  onTaskClick={setActiveDetailTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Creation/Editing Modal */}
      <CreateTaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTask(null);
        }}
        editTask={editTask}
      />

      {/* Task Detail Slide-over Sheet */}
      <TaskDetailSheet
        task={activeDetailTask}
        onClose={() => setActiveDetailTask(null)}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
