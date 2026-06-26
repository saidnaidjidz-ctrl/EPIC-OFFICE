'use client';

import React from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  Info,
  Clock
} from 'lucide-react';
import type { AuditEntry, Notification, UserRole } from '@/types';

// Helper to format date cleanly
function timeAgo(dateString: string) {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
  } catch {
    return 'recently';
  }
}

// Helper for Audit action icon
function getActionIcon(action: string | undefined | null) {
  if (!action) return <Info className="w-4 h-4 text-secondary" />;
  const lowercaseAction = action.toLowerCase();
  if (lowercaseAction.includes('create') || lowercaseAction.includes('add')) {
    return <Plus className="w-4 h-4 text-success" />;
  }
  if (lowercaseAction.includes('delete') || lowercaseAction.includes('remove')) {
    return <Trash2 className="w-4 h-4 text-error" />;
  }
  if (lowercaseAction.includes('update') || lowercaseAction.includes('edit')) {
    return <Edit className="w-4 h-4 text-accent" />;
  }
  return <Info className="w-4 h-4 text-secondary" />;
}

// Helper for Notification type icon
function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_assigned':
    case 'task_completed':
    case 'task_updated':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'meeting_scheduled':
    case 'meeting_updated':
    case 'meeting_cancelled':
      return <Calendar className="w-4 h-4 text-accent" />;
    case 'role_changed':
    case 'committee_assigned':
      return <ShieldAlert className="w-4 h-4 text-warning" />;
    default:
      return <Info className="w-4 h-4 text-text-secondary" />;
  }
}

interface RecentActivityProps {
  role: UserRole;
  activities?: AuditEntry[];
  notifications?: Notification[];
}

export default function RecentActivity({ role, activities = [], notifications = [] }: RecentActivityProps) {
  const isPresident = role === 'president';

  return (
    <div className="card-glass p-6 flex flex-col gap-6 h-full min-h-[350px]">
      <div className="flex justify-between items-center border-b border-border/50 pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-text-primary">
            {isPresident ? 'Recent Audit Activities' : 'Recent Alerts & Updates'}
          </h3>
          <p className="text-xs text-text-secondary">
            {isPresident ? 'Club administration event log' : 'Latest updates and reminders for you'}
          </p>
        </div>
        <Clock className="w-5 h-5 text-text-secondary opacity-60" />
      </div>

      {isPresident ? (
        // ─── President view: Audit Logs ───────────────────────────────────────
        activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            No recent audit events
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] hide-scrollbar pr-1">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-surface-2/40 border border-transparent hover:border-border/30 transition-all duration-200"
              >
                <div className="p-2.5 rounded-lg bg-surface-2/80 border border-border/50 mt-0.5">
                  {getActionIcon(activity.action || (activity as any).type)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {activity.user_name || 'System Activity'}
                    </span>
                    <span className="text-2xs text-text-secondary font-medium whitespace-nowrap">
                      {activity.created_at ? timeAgo(activity.created_at) : ((activity as any).time_ago || 'recently')}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {activity.action || (activity as any).message || 'Activity performed'} {activity.entity_type && <span className="font-semibold text-accent">{activity.entity_type}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ─── Member / Leader view: Notifications ──────────────────────────────
        notifications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            No recent alerts
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] hide-scrollbar pr-1">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex items-start gap-4 p-3 rounded-xl border transition-all duration-200 ${
                  notification.is_read 
                    ? 'hover:bg-surface-2/30 border-transparent hover:border-border/20' 
                    : 'bg-primary/10 border-primary/20 hover:border-primary/40'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-surface-2/80 border border-border/50 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {notification.title}
                    </span>
                    <span className="text-2xs text-text-secondary font-medium whitespace-nowrap">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {notification.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
