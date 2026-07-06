'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { Meeting } from '@/types';
import {
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  Users,
  Video,
  ChevronRight,
  Trash2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Link2,
} from 'lucide-react';
import CreateMeetingModal from '@/components/meetings/CreateMeetingModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isPast(iso: string) {
  return new Date(iso) < new Date();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MeetingsSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-36" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-10 w-40 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-glass p-5 flex items-start gap-5">
          <div className="skeleton w-14 h-14 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-4 w-full" />
            <div className="flex gap-4">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = user?.role === 'president' || user?.role === 'committee_leader';

  // ── Fetch meetings ──
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiClient.get<{ success: boolean; meetings: Meeting[]; count: number }>('/meetings'),
    enabled: !!user,
    refetchInterval: 30_000, // auto-refresh every 30s so all users see new meetings
    staleTime: 10_000,
  });

  const meetings: Meeting[] = data?.meetings ?? [];
  const upcoming = meetings.filter((m) => !isPast(m.scheduled_at));
  const past = meetings.filter((m) => isPast(m.scheduled_at));

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  const handleDelete = (id: string) => {
    if (!confirm('Cancel this meeting? All attendees will be notified.')) return;
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  // ── Loading / error ──
  if (isLoading) return <MeetingsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-6">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-text-primary">Failed to Load Meetings</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-sm">
            We couldn&apos;t connect to the server. Please try again.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderMeetingCard = (meeting: Meeting, i: number) => {
    const past = isPast(meeting.scheduled_at);
    const isCreator = meeting.created_by === user?.id;
    const canDelete = user?.role === 'president' || isCreator;
    const isVirtual = !!meeting.meeting_link;
    const attendeeCount =
      typeof meeting.attendees === 'number'
        ? meeting.attendees
        : Array.isArray(meeting.attendees)
        ? meeting.attendees.length
        : 0;

    return (
      <motion.div
        key={meeting.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className={`card-glass p-5 flex items-start gap-5 group transition-all ${
          past ? 'opacity-60' : 'hover:border-secondary/30 cursor-pointer'
        }`}
      >
        {/* Date block */}
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border ${
            past
              ? 'bg-white/5 border-white/10'
              : 'bg-secondary/10 border-secondary/20'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${past ? 'text-text-secondary' : 'text-secondary'}`}>
            {new Date(meeting.scheduled_at).toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-black text-text-primary leading-none">
            {new Date(meeting.scheduled_at).getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold text-sm ${past ? 'text-text-secondary' : 'text-text-primary group-hover:text-secondary transition-colors'}`}>
              {meeting.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {past ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/5 text-text-secondary border-white/10">
                  Past
                </span>
              ) : (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isVirtual
                    ? 'bg-accent/10 text-accent border-accent/20'
                    : 'bg-success/10 text-success border-success/20'
                }`}>
                  {isVirtual ? '🌐 Virtual' : '📍 In-Person'}
                </span>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(meeting.id)}
                  disabled={deletingId === meeting.id}
                  className="p-1.5 rounded-lg hover:bg-error/20 text-text-secondary/50 hover:text-error transition-all"
                  title="Cancel meeting"
                >
                  {deletingId === meeting.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {meeting.description && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-1">{meeting.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Clock className="w-3 h-3" />
              {formatDate(meeting.scheduled_at)} · {formatTime(meeting.scheduled_at)}
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <MapPin className="w-3 h-3" />
                {meeting.location}
              </span>
            )}
            {meeting.meeting_link && (
              <a
                href={meeting.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[11px] text-accent hover:underline"
              >
                <Link2 className="w-3 h-3" />
                Join Link
              </a>
            )}
            {attendeeCount > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <Users className="w-3 h-3" />
                {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
              </span>
            )}
            {meeting.creator_name && (
              <span className="text-[11px] text-text-secondary/60">
                by {meeting.creator_name}
              </span>
            )}
          </div>
        </div>

        {!past && (
          <ChevronRight className="w-4 h-4 text-text-secondary/40 group-hover:text-secondary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-accent" />
            Meetings
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setEditingMeeting(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Empty state */}
      {meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
          <div className="p-5 rounded-full bg-accent/10 border border-accent/20 text-accent">
            <CalendarDays className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">No meetings yet</h3>
            <p className="text-sm text-text-secondary mt-1">
              {canCreate
                ? 'Schedule the first meeting using the button above.'
                : 'No meetings have been scheduled yet.'}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid gap-3">
            {upcoming.map((m, i) => renderMeetingCard(m, i))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
            Past ({past.length})
          </h2>
          <div className="grid gap-3">
            {past.map((m, i) => renderMeetingCard(m, i))}
          </div>
        </section>
      )}

      {/* Modal */}
      <CreateMeetingModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingMeeting(null); }}
        editingMeeting={editingMeeting}
      />
    </div>
  );
}
