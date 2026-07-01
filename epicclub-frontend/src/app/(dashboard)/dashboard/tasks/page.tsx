'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Task, TaskStatus, TaskPriority, Committee, User, CommitteeDetail } from '@/types';
import TaskFilters, { EMPTY_FILTERS, type TaskFilterState } from '@/components/tasks/TaskFilters';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TasksTable from '@/components/tasks/TasksTable';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import { CheckSquare, LayoutGrid, List, Plus, AlertCircle, RefreshCw, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Backend Task response representation prior to mapper enrichment
interface BackendTask {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  start_date: string;
  due_date: string | null;
  completed_at: string | null;
  committee_id: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  assignee_avatar_url?: string;
  committee_name?: string;
  creator_name?: string;
}

interface TaskPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper to map flat backend task fields into the object structure expected by components
const mapBackendTaskToFrontend = (task: BackendTask): Task => {
  return {
    ...task,
    assignee: task.assigned_to
      ? {
          id: task.assigned_to,
          name: task.assignee_name || 'Unknown User',
          avatar_url: task.assignee_avatar_url || null,
        }
      : undefined,
    committee: task.committee_id
      ? {
          id: task.committee_id,
          name: task.committee_name || 'Unknown Committee',
        }
      : undefined,
    creator: task.created_by
      ? {
          id: task.created_by,
          name: task.creator_name || 'Unknown Creator',
        }
      : undefined,
  };
};

function TasksPageContent() {
  const { user } = useAuthStore();
  const role = user?.role || 'member';
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  // ─── Component State ────────────────────────────────────────────────────────
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ─── Query Params Scoping ──────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      limit: 50,
      page: 1,
    };
    if (filters.statuses.length > 0) {
      params.status = filters.statuses[0];
    }
    if (filters.priorities.length > 0) {
      params.priority = filters.priorities[0];
    }
    if (filters.committee_id) {
      params.committee_id = filters.committee_id;
    }
    if (filters.assignee_id) {
      params.assigned_to = filters.assignee_id;
    }
    if (filters.due_from) {
      params.due_date_from = filters.due_from;
    }
    if (filters.due_to) {
      params.due_date_to = filters.due_to;
    }
    return params;
  }, [filters]);

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

  // ─── React Query Hooks ──────────────────────────────────────────────────────
  
  // 1. Fetch Tasks
  const { data: tasksData, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', activeFilters],
    queryFn: async () => {
      const response = await apiClient.get<{ tasks: BackendTask[]; pagination: TaskPagination }>('/tasks', activeFilters);
      return {
        tasks: (response.tasks || []).map(mapBackendTaskToFrontend),
        pagination: response.pagination,
      };
    },
    enabled: !!user,
  });

  const tasksList = tasksData?.tasks || [];

  const filteredTasks = useMemo(() => {
    let list = tasksList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tasksList, searchQuery]);

  // 2. Fetch Committees for Filters
  const { data: committeesRes } = useQuery({
    queryKey: ['committees-list'],
    queryFn: () => apiClient.get<{ committees: Committee[] }>('/committees'),
    enabled: !!user,
  });
  const committeesList = committeesRes?.committees || [];

  // 3. Fetch Members for Filters dropdown (conditional based on role and selected committee)
  const canFilterByAssignee = role === 'president' || role === 'committee_leader';
  const { data: membersRes } = useQuery({
    queryKey: ['filter-members', role, filters.committee_id, user?.committee_id],
    queryFn: async () => {
      if (role === 'president') {
        if (filters.committee_id) {
          const res = await apiClient.get<{ committee: CommitteeDetail }>(`/committees/${filters.committee_id}`);
          return res.committee?.members || [];
        } else {
          const res = await apiClient.get<{ users: User[] }>('/users?status=approved&limit=50');
          return res.users || [];
        }
      } else if (role === 'committee_leader' && user?.committee_id) {
        const res = await apiClient.get<{ committee: CommitteeDetail }>(`/committees/${user.committee_id}`);
        return res.committee?.members || [];
      }
      return [];
    },
    enabled: !!user && canFilterByAssignee,
  });
  const membersList = membersRes || [];

  // ─── Mutation Hooks ─────────────────────────────────────────────────────────

  // 1. Optimistic status update (Drag-and-Drop)
  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      apiClient.patch<ApiResponse<Task>>(`/tasks/${taskId}`, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', activeFilters] });
      const previousTasks = queryClient.getQueryData<{ tasks: Task[]; pagination: TaskPagination }>(['tasks', activeFilters]);
      
      if (previousTasks) {
        queryClient.setQueryData(['tasks', activeFilters], {
          ...previousTasks,
          tasks: previousTasks.tasks.map((t) =>
            t.id === taskId ? { ...t, status } : t
          ),
        });
      }
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', activeFilters], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // 2. Delete task
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedTask(null);
    },
  });

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    statusMutation.mutate({ taskId, status: newStatus });
  };

  const handleCreateTaskClick = () => {
    setEditTask(null);
    setCreateModalOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setEditTask(task);
    setCreateModalOpen(true);
  };

  const handleDeleteClick = (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
    }
  };

  const canManage = role === 'president' || role === 'committee_leader';

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative min-h-screen">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Tasks Management</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {role === 'member'
                ? 'Manage and complete tasks assigned to you'
                : 'Plan, assign, and track tasks across committees'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="flex lg:hidden items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs font-semibold text-text-secondary hover:text-text-primary transition-all duration-200"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent text-background text-3xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <div className="flex rounded-xl bg-surface border border-border/80 p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                view === 'kanban' ? 'bg-surface-2 text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Kanban view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                view === 'table' ? 'bg-surface-2 text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create Button */}
          {canManage && (
            <button onClick={() => handleCreateTaskClick()} className="btn-primary py-2 px-4 flex items-center gap-1.5 shadow-glow-purple/20 text-xs ml-auto sm:ml-0">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* ─── Layout Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 sticky top-24">
          <TaskFilters
            filters={filters}
            onChange={setFilters}
            committees={committeesList}
            members={membersList}
            canFilterByAssignee={canFilterByAssignee}
            activeFilterCount={activeFilterCount}
          />
        </aside>

        {/* Tasks View Workspace */}
        <section className="col-span-1 lg:col-span-3 min-h-[500px]">
          {searchQuery && (
            <div className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-xs text-text-primary animate-fade-in">
              <span className="flex items-center gap-1.5 font-medium font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block animate-pulse" />
                Showing results for search: <strong className="text-secondary">&ldquo;{searchQuery}&rdquo;</strong>
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.delete('search');
                  router.push(`${window.location.pathname}?${params.toString()}`);
                }}
                className="text-text-secondary hover:text-text-primary font-semibold flex items-center gap-1 hover:underline transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          )}
          {tasksLoading ? (
            <div className="flex flex-col gap-4">
              {view === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="card-glass p-5 flex flex-col gap-4 h-[350px]">
                      <div className="skeleton h-5 w-24" />
                      <div className="skeleton h-16 w-full mt-2" />
                      <div className="skeleton h-8 w-2/3 mt-2" />
                      <div className="skeleton h-6 w-1/3 mt-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-container p-4">
                  <div className="skeleton h-10 w-full mb-3" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-12 w-full mb-2" />
                  ))}
                </div>
              )}
            </div>
          ) : tasksError ? (
            <div className="flex flex-col items-center justify-center min-h-[350px] gap-4 text-center card-glass p-8">
              <div className="p-3.5 rounded-full bg-error/10 border border-error/20 text-error">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-text-primary">Failed to load tasks</h3>
                <p className="text-xs text-text-secondary max-w-sm">
                  We had an issue retrieving the tasks list. Please try again.
                </p>
              </div>
              <button onClick={() => refetchTasks()} className="btn-primary py-2 px-4 flex items-center gap-1.5 text-xs mt-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <div className="animate-fade-in h-full">
              {view === 'kanban' ? (
                <KanbanBoard
                  tasks={filteredTasks}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                  }}
                  onTaskMove={handleTaskMove}
                  onCreateTask={canManage ? () => handleCreateTaskClick() : undefined}
                  canCreate={canManage}
                />
              ) : (
                <TasksTable
                  tasks={filteredTasks}
                  userRole={role}
                  userId={user?.id || ''}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                  }}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              )}
            </div>
          )}
        </section>
      </div>

      {/* ─── Slide-over Details Sheet ─── */}
      <TaskDetailSheet
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* ─── Task Create/Edit Modal ─── */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditTask(null);
        }}
        editTask={editTask}
      />

      {/* ─── Mobile Filters Drawer ─── */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Sidebar drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border p-5 overflow-y-auto z-50 lg:hidden flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">Filters</span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <TaskFilters
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                }}
                committees={committeesList}
                members={membersList}
                canFilterByAssignee={canFilterByAssignee}
                activeFilterCount={activeFilterCount}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-8 animate-fade-in">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-9 w-64" />
          <div className="skeleton h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-glass p-5 flex flex-col gap-4 h-[350px]">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-16 w-full mt-2" />
              <div className="skeleton h-8 w-2/3 mt-2" />
            </div>
          ))}
        </div>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  );
}
