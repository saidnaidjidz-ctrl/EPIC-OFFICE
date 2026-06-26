'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, MapPin, Link2, Users, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Meeting, Committee, PaginatedResponse, User } from '@/types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const meetingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  scheduled_at: z.string().min(1, 'Scheduled date is required'),
  location: z.string().optional(),
  meeting_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  committee_id: z.string().optional(),
  attendees: z.array(z.string()).min(1, 'Select at least one attendee'),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  editingMeeting?: Meeting | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateMeetingModal({
  open,
  onClose,
  editingMeeting,
}: CreateMeetingModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingMeeting;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      scheduled_at: '',
      location: '',
      meeting_link: '',
      committee_id: '',
      attendees: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: editingMeeting?.title || '',
        description: editingMeeting?.description || '',
        scheduled_at: editingMeeting?.scheduled_at
          ? new Date(editingMeeting.scheduled_at).toISOString().slice(0, 16)
          : '',
        location: editingMeeting?.location || '',
        meeting_link: editingMeeting?.meeting_link || '',
        committee_id: editingMeeting?.committee_id || '',
        attendees: [],
      });
    }
  }, [editingMeeting, open, reset]);

  // Fetch data
  const { data: committeesData } = useQuery({
    queryKey: ['committees-list'],
    queryFn: () => apiClient.get<PaginatedResponse<Committee>>('/committees', { limit: 100 }),
    enabled: open,
  });
  const { data: usersData } = useQuery({
    queryKey: ['users-list-meeting'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<User>>('/users', { limit: 200, status: 'approved' }),
    enabled: open,
  });

  const committees = committeesData?.data || [];
  const users = usersData?.data || [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: MeetingFormData) =>
      apiClient.post<ApiResponse<Meeting>>('/meetings', {
        ...data,
        meeting_link: data.meeting_link || undefined,
        committee_id: data.committee_id || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      handleClose();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: MeetingFormData) =>
      apiClient.patch<ApiResponse<Meeting>>(`/meetings/${editingMeeting?.id}`, {
        ...data,
        meeting_link: data.meeting_link || undefined,
        committee_id: data.committee_id || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      handleClose();
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: MeetingFormData) => {
    if (isEditing) {
      editMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const mutationError = createMutation.error || editMutation.error;
  const selectedAttendees = watch('attendees') || [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col card-glass border border-white/10 rounded-2xl shadow-2xl animate-scale-in z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/20 text-accent">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {isEditing ? 'Edit Meeting' : 'Schedule Meeting'}
            </h2>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2 rounded-xl" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {mutationError && (
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
              {(mutationError as { message?: string })?.message || 'An error occurred.'}
            </div>
          )}

          <form id="meeting-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="form-label">Meeting Title</label>
              <input
                {...register('title')}
                className="form-input"
                placeholder="e.g. Monthly Board Review"
              />
              {errors.title && <p className="text-error text-xs">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="form-label">Description</label>
              <textarea
                {...register('description')}
                className="form-input resize-none"
                rows={2}
                placeholder="Agenda and purpose..."
              />
            </div>

            {/* Date/Time */}
            <div className="flex flex-col gap-1.5">
              <label className="form-label flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Scheduled At
              </label>
              <input
                type="datetime-local"
                {...register('scheduled_at')}
                className="form-input"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.scheduled_at && (
                <p className="text-error text-xs">{errors.scheduled_at.message}</p>
              )}
            </div>

            {/* Location + Link */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="form-label flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </label>
                <input
                  {...register('location')}
                  className="form-input"
                  placeholder="Conference Room 1"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="form-label flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5" /> Meeting Link
                </label>
                <input
                  {...register('meeting_link')}
                  className="form-input"
                  placeholder="https://meet.google.com/..."
                />
                {errors.meeting_link && (
                  <p className="text-error text-xs">{errors.meeting_link.message}</p>
                )}
              </div>
            </div>

            {/* Committee (optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="form-label">Committee (optional)</label>
              <select {...register('committee_id')} className="form-input">
                <option value="">All Club (no specific committee)</option>
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Attendees */}
            <div className="flex flex-col gap-1.5">
              <label className="form-label flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Attendees
                {selectedAttendees.length > 0 && (
                  <span className="ml-auto badge-info text-xs">
                    {selectedAttendees.length} selected
                  </span>
                )}
              </label>
              <Controller
                name="attendees"
                control={control}
                render={({ field }) => (
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1 bg-white/5 rounded-xl p-2 border border-white/10">
                    {users.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={u.id}
                          checked={field.value?.includes(u.id)}
                          onChange={(e) => {
                            const current = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...current, u.id]);
                            } else {
                              field.onChange(current.filter((id) => id !== u.id));
                            }
                          }}
                          className="rounded text-accent"
                        />
                        <span className="text-sm text-text-primary truncate">{u.name}</span>
                        <span className="text-xs text-text-secondary ml-auto truncate">
                          {u.email}
                        </span>
                      </label>
                    ))}
                    {users.length === 0 && (
                      <p className="text-sm text-text-secondary text-center py-2">
                        No members found.
                      </p>
                    )}
                  </div>
                )}
              />
              {errors.attendees && (
                <p className="text-error text-xs">{errors.attendees.message}</p>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-white/10 flex-shrink-0">
          <button type="button" onClick={handleClose} className="btn-ghost flex-1 py-2.5">
            Cancel
          </button>
          <button
            type="submit"
            form="meeting-form"
            disabled={createMutation.isPending || editMutation.isPending}
            className="btn-primary flex-1 py-2.5"
          >
            {isEditing ? 'Save Changes' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
