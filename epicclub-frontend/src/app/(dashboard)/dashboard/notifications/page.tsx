'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { Notification, ApiResponse, PaginatedResponse } from '@/types';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Calendar,
  Users,
  Settings,
  Info,
  ArrowRight,
} from 'lucide-react';

// ─── Notification Icon Map ────────────────────────────────────────────────────

const NOTIF_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  task_assigned:   { icon: <CheckSquare className="w-4 h-4" />, color: 'text-accent bg-accent/10 border-accent/20' },
  task_updated:    { icon: <CheckSquare className="w-4 h-4" />, color: 'text-warning bg-warning/10 border-warning/20' },
  task_completed:  { icon: <CheckCheck className="w-4 h-4" />,  color: 'text-success bg-success/10 border-success/20' },
  meeting_scheduled: { icon: <Calendar className="w-4 h-4" />, color: 'text-secondary bg-secondary/10 border-secondary/20' },
  meeting_updated:   { icon: <Calendar className="w-4 h-4" />, color: 'text-warning bg-warning/10 border-warning/20'   },
  meeting_cancelled: { icon: <Calendar className="w-4 h-4" />, color: 'text-error bg-error/10 border-error/20'         },
  committee_assigned: { icon: <Users className="w-4 h-4" />,   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  role_changed:       { icon: <Settings className="w-4 h-4" />, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  system:             { icon: <Info className="w-4 h-4" />,      color: 'text-text-secondary bg-white/5 border-white/10'         },
};

// ─── Single Notification Item ─────────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const iconConfig = NOTIF_ICONS[notification.type] || NOTIF_ICONS.system || { icon: null, color: '' };
  const { icon, color } = iconConfig;
  const timeAgo = (() => {
    const diff = Date.now() - new Date(notification.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group ${
        notification.is_read
          ? 'border-white/5 bg-white/[0.02] opacity-60'
          : 'border-white/10 bg-white/5 hover:bg-white/8'
      }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-tight ${notification.is_read ? 'text-text-secondary' : 'text-text-primary'}`}>
            {notification.title}
          </p>
          <span className="text-xs text-text-secondary flex-shrink-0 mt-0.5">{timeAgo}</span>
        </div>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">
          {notification.body}
        </p>
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="btn-ghost p-1.5 text-success"
            aria-label="Mark as read"
            title="Mark as read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          className="btn-ghost p-1.5 text-error"
          aria-label="Delete notification"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="skeleton h-9 w-64" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card-glass p-4 flex items-start gap-4">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<FilterType>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiClient.get<{ success: boolean; notifications: Notification[] }>('/notifications', { limit: 100 }),
    enabled: !!user,
    staleTime: 15_000,
  });

  const allNotifications = data?.notifications || [];
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const filtered = allNotifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiClient.delete('/notifications'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <NotificationsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-6 animate-fade-in">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">Failed to Load Notifications</h3>
        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-warning" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Notifications
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
              : 'All caught up!'}
          </p>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4 text-success" />
              Mark All Read
            </button>
          )}
          {allNotifications.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all notifications?')) clearAllMutation.mutate();
              }}
              disabled={clearAllMutation.isPending}
              className="btn-ghost flex items-center gap-2 text-sm text-error"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f
                ? 'bg-warning text-surface font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-error text-white text-xs rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notifications List ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
          <div className="p-4 rounded-full bg-warning/10 text-warning">
            <BellOff className="w-10 h-10" />
          </div>
          <p className="text-text-secondary text-sm">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications to show.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          {filtered.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
