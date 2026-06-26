'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Loader2, Sparkles } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';
import { motion } from 'framer-motion';

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch only the 10 most recent notifications
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ limit: 10 });

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Restrict to most recent 10 items
  const recentNotifications = notifications.slice(0, 10);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 mt-2 w-80 md:w-96 card-glass border border-white/10 rounded-2xl shadow-2xl py-2 z-50 flex flex-col max-h-[500px]"
      style={{ top: '100%' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-error/20 text-error border border-error/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Scrollable Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[350px] p-2 flex flex-col gap-1.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs">Loading feed...</span>
          </div>
        ) : recentNotifications.length > 0 ? (
          recentNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              onItemClick={onClose}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-text-secondary/60" />
            </div>
            <p className="text-sm font-semibold text-text-primary">All caught up!</p>
            <p className="text-xs text-text-secondary/70 mt-1 max-w-[200px]">
              You don't have any notifications at the moment.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/5 text-center bg-white/[0.02]">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="block text-xs font-semibold text-accent hover:text-accent/80 transition-colors py-1.5"
        >
          View all notifications
        </Link>
      </div>
    </motion.div>
  );
}
