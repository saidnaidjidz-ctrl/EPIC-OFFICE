'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Users, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Committee } from '@/types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const committeeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
});

type CommitteeFormData = z.infer<typeof committeeSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateCommitteeModalProps {
  open: boolean;
  onClose: () => void;
  editingCommittee?: Committee | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCommitteeModal({
  open,
  onClose,
  editingCommittee,
}: CreateCommitteeModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingCommittee;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommitteeFormData>({
    resolver: zodResolver(committeeSchema),
    defaultValues: {
      name: editingCommittee?.name || '',
      description: editingCommittee?.description || '',
    },
  });

  // Reset form on open/edit change
  React.useEffect(() => {
    reset({
      name: editingCommittee?.name || '',
      description: editingCommittee?.description || '',
    });
  }, [editingCommittee, reset, open]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: CommitteeFormData) =>
      apiClient.post<ApiResponse<Committee>>('/committees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      handleClose();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: CommitteeFormData) =>
      apiClient.patch<ApiResponse<Committee>>(`/committees/${editingCommittee?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committees'] });
      handleClose();
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: CommitteeFormData) => {
    if (isEditing) {
      editMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const mutationError = createMutation.error || editMutation.error;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg card-glass border border-white/10 rounded-2xl shadow-2xl animate-scale-in p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {isEditing ? 'Edit Committee' : 'Create Committee'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="btn-ghost p-2 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {mutationError && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
            {(mutationError as { message?: string })?.message || 'An error occurred.'}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="form-label flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Committee Name
            </label>
            <input
              {...register('name')}
              className="form-input"
              placeholder="e.g. Technical Affairs"
            />
            {errors.name && (
              <p className="text-error text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="form-label">Description</label>
            <textarea
              {...register('description')}
              className="form-input resize-none"
              rows={3}
              placeholder="Describe the committee's purpose and responsibilities..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost flex-1 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending || editMutation.isPending}
              className="btn-primary flex-1 py-2.5"
            >
              {isEditing ? 'Save Changes' : 'Create Committee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
