'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckSquare, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Task, Committee, User, ApiResponse, CreateTaskPayload } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title too long')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description too long')
    .trim()
    .optional(),
  committee_id: z.string().uuid('Select a valid committee'),
  assigned_to: z.string().uuid('Select a valid assignee'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    message: 'Select a priority level',
  }),
  due_date: z
    .string()
    .min(1, 'Due date is required')
    .refine((v) => new Date(v) >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: 'Due date cannot be in the past',
    }),
});

type TaskFormData = z.infer<typeof taskSchema>;

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    color: 'text-success' },
  { value: 'medium', label: 'Medium', color: 'text-warning' },
  { value: 'high',   label: 'High',   color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-error' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  editTask?: Task | null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CreateTaskModal({ open, onClose, editTask }: CreateTaskModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isEdit = !!editTask;
  const canAssign = user?.role === 'president' || user?.role === 'committee_leader';

  // ── Fetch Committees ──────────────────────────────────────────────────────
  const { data: committeesData } = useQuery({
    queryKey: ['committees-list'],
    queryFn: () => apiClient.get<{ success: boolean; committees: Committee[] }>('/committees'),
    enabled: open && canAssign,
  });
  const committees = committeesData?.committees || [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      committee_id: user?.committee_id || '',
      assigned_to: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const selectedCommitteeId = watch('committee_id');

  // ── Fetch members of selected committee ──────────────────────────────────
  const { data: membersData } = useQuery({
    queryKey: ['committee-members', selectedCommitteeId],
    queryFn: () => apiClient.get<{ success: boolean; committee: { members: Pick<User, 'id' | 'name'>[] } }>(`/committees/${selectedCommitteeId}`),
    enabled: !!selectedCommitteeId && open,
  });
  const members = membersData?.committee?.members || [];

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (editTask) {
      reset({
        title: editTask.title,
        description: editTask.description || '',
        committee_id: editTask.committee_id,
        assigned_to: editTask.assigned_to,
        priority: editTask.priority,
        due_date: editTask.due_date ? editTask.due_date.split('T')[0] : '',
      });
    } else {
      reset({
        title: '',
        description: '',
        committee_id: user?.committee_id || '',
        assigned_to: '',
        priority: 'medium',
        due_date: '',
      });
    }
  }, [editTask, open, reset, user?.committee_id]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) =>
      apiClient.post<ApiResponse<Task>>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateTaskPayload>) =>
      apiClient.patch<ApiResponse<Task>>(`/tasks/${editTask?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const onSubmit = async (data: TaskFormData) => {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const resolvedCommitteeId = user?.role === 'committee_leader' ? (user.committee_id ?? data.committee_id) : data.committee_id;
    const payload = {
      ...data,
      committee_id: resolvedCommitteeId,
      start_date: todayDateStr,
      due_date: data.due_date,
      description: data.description || undefined,
    };
    await mutation.mutateAsync(payload as CreateTaskPayload);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div
              className="card-glass w-full max-w-lg flex flex-col gap-6 p-7 max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-primary">
                    <CheckSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {isEdit ? 'Edit Task' : 'Create Task'}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {isEdit ? 'Update task details' : 'Assign work to a committee member'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Banner */}
              {mutation.isError && (
                <div className="alert-error text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {(mutation.error as { message?: string })?.message || 'Failed to save task. Try again.'}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
                {/* Title */}
                <div className="form-group">
                  <label className="label">Task Title <span className="text-error">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., Design the marketing banner"
                    className={`input ${errors.title ? 'input-error' : ''}`}
                    {...register('title')}
                  />
                  {errors.title && <p className="error-text">{errors.title.message}</p>}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea
                    placeholder="Provide context, acceptance criteria, or relevant links..."
                    rows={3}
                    className={`input resize-none ${errors.description ? 'input-error' : ''}`}
                    {...register('description')}
                  />
                  {errors.description && <p className="error-text">{errors.description.message}</p>}
                </div>

                {/* Committee + Assignee (2-col when leader) */}
                {canAssign ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Committee */}
                    <div className="form-group">
                      <label className="label">Committee <span className="text-error">*</span></label>
                      <select
                        className={`input ${errors.committee_id ? 'input-error' : ''}`}
                        {...register('committee_id')}
                        disabled={user?.role === 'committee_leader'}
                      >
                        <option value="">Select Committee</option>
                        {committees.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {errors.committee_id && <p className="error-text">{errors.committee_id.message}</p>}
                    </div>

                    {/* Assignee */}
                    <div className="form-group">
                      <label className="label">Assign To <span className="text-error">*</span></label>
                      <select
                        className={`input ${errors.assigned_to ? 'input-error' : ''}`}
                        {...register('assigned_to')}
                        disabled={!selectedCommitteeId}
                      >
                        <option value="">
                          {!selectedCommitteeId ? 'Select committee first' : 'Select Member'}
                        </option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {errors.assigned_to && <p className="error-text">{errors.assigned_to.message}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary bg-surface-2/40 border border-border/40 rounded-xl px-3 py-2">
                    This task will be assigned within your committee.
                  </p>
                )}

                {/* Priority + Due Date (2-col) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="form-group">
                    <label className="label">Priority <span className="text-error">*</span></label>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-1.5">
                          {PRIORITY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`px-2 py-1.5 rounded-lg text-2xs font-bold border transition-all duration-150 ${
                                field.value === opt.value
                                  ? `border-current bg-current/20 ${opt.color}`
                                  : 'border-border bg-surface-2/30 text-text-secondary hover:border-border/80'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                    {errors.priority && <p className="error-text">{errors.priority.message}</p>}
                  </div>

                  {/* Due Date */}
                  <div className="form-group">
                    <label className="label">Due Date <span className="text-error">*</span></label>
                    <input
                      type="date"
                      min={today}
                      className={`input ${errors.due_date ? 'input-error' : ''}`}
                      {...register('due_date')}
                    />
                    {errors.due_date && <p className="error-text">{errors.due_date.message}</p>}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1">
                    {mutation.isPending ? (
                      <><span className="spinner" />{isEdit ? 'Saving...' : 'Creating...'}</>
                    ) : (
                      <><CheckSquare className="w-4 h-4" />{isEdit ? 'Save Changes' : 'Create Task'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
