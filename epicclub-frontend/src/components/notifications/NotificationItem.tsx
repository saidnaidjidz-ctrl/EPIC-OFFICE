'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  RefreshCw,
  CalendarDays,
  XCircle,
  CheckCircle2,
  Ban,
  Building2,
  CheckSquare,
  FileEdit,
  UserCog,
  Info,
  Check,
  Trash2,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';

// ─── Formatting Helper ────────────────────────────────────────────────────────
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Type to Styling Map ──────────────────────────────────────────────────────
interface TypeConfig {
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  link: string;
}

const TYPE_CONFIGS: Record<NotificationType, TypeConfig> = {
  task_assigned: {
    icon: <ClipboardList className="w-4 h-4" />,
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    textClass: 'text-blue-400',
    link: '/dashboard/tasks',
  },
  task_status_changed: {
    icon: <RefreshCw className="w-4 h-4" />,
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    textClass: 'text-purple-400',
    link: '/dashboard/tasks',
  },
  task_completed: {
    icon: <CheckSquare className="w-4 h-4" />,
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    textClass: 'text-emerald-400',
    link: '/dashboard/tasks',
  },
  task_updated: {
    icon: <FileEdit className="w-4 h-4" />,
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    textClass: 'text-amber-400',
    link: '/dashboard/tasks',
  },
  meeting_scheduled: {
    icon: <CalendarDays className="w-4 h-4" />,
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    textClass: 'text-emerald-400',
    link: '/dashboard/meetings',
  },
  meeting_cancelled: {
    icon: <XCircle className="w-4 h-4" />,
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    textClass: 'text-rose-400',
    link: '/dashboard/meetings',
  },
  meeting_updated: {
    icon: <CalendarDays className="w-4 h-4" />,
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    textClass: 'text-amber-400',
    link: '/dashboard/meetings',
  },
  committee_assigned: {
    icon: <Building2 className="w-4 h-4" />,
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    textClass: 'text-blue-400',
    link: '/dashboard/committees',
  },
  role_changed: {
    icon: <UserCog className="w-4 h-4" />,
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    textClass: 'text-purple-400',
    link: '/dashboard',
  },
  member_approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    textClass: 'text-emerald-400',
    link: '/dashboard/users',
  },
  member_rejected: {
    icon: <Ban className="w-4 h-4" />,
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    textClass: 'text-rose-400',
    link: '/dashboard',
  },
  admin_broadcast: {
    icon: <Info className="w-4 h-4" />,
    bgClass: 'bg-cyan-500/10 border-cyan-500/20',
    textClass: 'text-cyan-400',
    link: '/dashboard',
  },
  system: {
    icon: <Info className="w-4 h-4" />,
    bgClass: 'bg-slate-500/10 border-slate-500/20',
    textClass: 'text-text-secondary',
    link: '/dashboard',
  },
};

// ─── Component Props ──────────────────────────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onItemClick?: () => void;
}

export default function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onItemClick,
}: NotificationItemProps) {
  const router = useRouter();
  const config = TYPE_CONFIGS[notification.type] || TYPE_CONFIGS.system;

  const handleClick = (e: React.MouseEvent) => {
    // If user clicked inside control buttons, don't trigger item navigation
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    if (onMarkRead && !notification.is_read) {
      onMarkRead(notification.id);
    }
    if (onItemClick) {
      onItemClick();
    }
    router.push(config.link);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group flex gap-3 p-4 border rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-200 ${
        notification.is_read
          ? 'bg-transparent border-white/5'
          : 'bg-white/5 border-white/10 shadow-sm'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${config.bgClass} ${config.textClass} flex-shrink-0`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-12">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`text-sm font-semibold truncate ${
              notification.is_read ? 'text-text-primary/95' : 'text-text-primary font-bold'
            }`}
          >
            {notification.title}
          </span>
          {!notification.is_read && (
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
          {notification.body}
        </p>
        <span className="text-[10px] text-text-secondary/70 mt-1.5 block">
          {formatTimeAgo(notification.created_at)}
        </span>
      </div>

      {/* Floating Action Controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {!notification.is_read && onMarkRead && (
          <button
            onClick={() => onMarkRead(notification.id)}
            title="Mark as read"
            className="p-1.5 rounded-lg bg-surface border border-white/10 text-text-secondary hover:text-success hover:border-success/30 transition-all duration-150"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(notification.id)}
            title="Delete notification"
            className="p-1.5 rounded-lg bg-surface border border-white/10 text-text-secondary hover:text-error hover:border-error/30 transition-all duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
