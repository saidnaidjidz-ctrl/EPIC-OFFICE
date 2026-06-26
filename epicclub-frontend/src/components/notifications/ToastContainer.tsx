'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, ClipboardList, RefreshCw, CalendarDays, XCircle, CheckCircle2, Ban, Building2, CheckSquare, FileEdit, UserCog, Info } from 'lucide-react';
import { useNotificationStore, type Toast } from '@/store/notificationStore';
import { AnimatePresence, motion } from 'framer-motion';
import type { NotificationType } from '@/types';

// ─── Type to Styling Map ──────────────────────────────────────────────────────
interface ToastTypeConfig {
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  iconBgClass: string;
  iconTextClass: string;
  link: string;
}

const TOAST_TYPE_CONFIGS: Record<NotificationType, ToastTypeConfig> = {
  task_assigned: {
    icon: <ClipboardList className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-blue-500/30 shadow-blue-500/5',
    iconBgClass: 'bg-blue-500/15',
    iconTextClass: 'text-blue-400',
    link: '/dashboard/tasks',
  },
  task_status_changed: {
    icon: <RefreshCw className="w-4 h-4 animate-spin-slow" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-purple-500/30 shadow-purple-500/5',
    iconBgClass: 'bg-purple-500/15',
    iconTextClass: 'text-purple-400',
    link: '/dashboard/tasks',
  },
  task_completed: {
    icon: <CheckSquare className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-emerald-500/30 shadow-emerald-500/5',
    iconBgClass: 'bg-emerald-500/15',
    iconTextClass: 'text-emerald-400',
    link: '/dashboard/tasks',
  },
  task_updated: {
    icon: <FileEdit className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-amber-500/30 shadow-amber-500/5',
    iconBgClass: 'bg-amber-500/15',
    iconTextClass: 'text-amber-400',
    link: '/dashboard/tasks',
  },
  meeting_scheduled: {
    icon: <CalendarDays className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-emerald-500/30 shadow-emerald-500/5',
    iconBgClass: 'bg-emerald-500/15',
    iconTextClass: 'text-emerald-400',
    link: '/dashboard/meetings',
  },
  meeting_cancelled: {
    icon: <XCircle className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-rose-500/30 shadow-rose-500/5',
    iconBgClass: 'bg-rose-500/15',
    iconTextClass: 'text-rose-400',
    link: '/dashboard/meetings',
  },
  meeting_updated: {
    icon: <CalendarDays className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-amber-500/30 shadow-amber-500/5',
    iconBgClass: 'bg-amber-500/15',
    iconTextClass: 'text-amber-400',
    link: '/dashboard/meetings',
  },
  committee_assigned: {
    icon: <Building2 className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-blue-500/30 shadow-blue-500/5',
    iconBgClass: 'bg-blue-500/15',
    iconTextClass: 'text-blue-400',
    link: '/dashboard/committees',
  },
  role_changed: {
    icon: <UserCog className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-purple-500/30 shadow-purple-500/5',
    iconBgClass: 'bg-purple-500/15',
    iconTextClass: 'text-purple-400',
    link: '/dashboard',
  },
  member_approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-emerald-500/30 shadow-emerald-500/5',
    iconBgClass: 'bg-emerald-500/15',
    iconTextClass: 'text-emerald-400',
    link: '/dashboard/users',
  },
  member_rejected: {
    icon: <Ban className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-rose-500/30 shadow-rose-500/5',
    iconBgClass: 'bg-rose-500/15',
    iconTextClass: 'text-rose-400',
    link: '/dashboard',
  },
  admin_broadcast: {
    icon: <Info className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-cyan-500/30 shadow-cyan-500/5',
    iconBgClass: 'bg-cyan-500/15',
    iconTextClass: 'text-cyan-400',
    link: '/dashboard',
  },
  system: {
    icon: <Info className="w-4 h-4" />,
    bgClass: 'bg-slate-900/90 backdrop-blur-md',
    borderClass: 'border-white/10 shadow-glow/5',
    iconBgClass: 'bg-white/10',
    iconTextClass: 'text-text-secondary',
    link: '/dashboard',
  },
};

export default function ToastContainer() {
  const router = useRouter();
  const { toasts, removeToast } = useNotificationStore();

  const handleToastClick = (toast: Toast) => {
    removeToast(toast.id);
    const config = TOAST_TYPE_CONFIGS[toast.type] || TOAST_TYPE_CONFIGS.system;
    router.push(config.link);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = TOAST_TYPE_CONFIGS[toast.type] || TOAST_TYPE_CONFIGS.system;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.85, transition: { duration: 0.15 } }}
              layout
              onClick={() => handleToastClick(toast)}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${config.bgClass} ${config.borderClass} shadow-xl cursor-pointer hover:bg-slate-900/95 transition-colors group`}
            >
              {/* Type icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconBgClass} ${config.iconTextClass} flex-shrink-0`}>
                {config.icon}
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-bold text-text-primary leading-tight">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-text-secondary mt-1 leading-normal line-clamp-2">
                  {toast.body}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="text-text-secondary/60 hover:text-text-primary p-1 rounded-lg hover:bg-white/5 transition-all flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
