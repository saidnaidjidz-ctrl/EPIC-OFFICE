'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';

export default function NotificationCenter() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch notifications based on current tab filter & page
  const {
    notifications,
    pagination,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    page,
    limit,
    unread_only: tab === 'unread' ? true : undefined,
  });

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface/40 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center border border-secondary/25 text-secondary">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-primary">Notifications Center</h1>
            <p className="text-xs text-text-secondary mt-1">
              Stay updated with tasks, meetings, committees, and administrative actions.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-sm font-semibold transition-all duration-200"
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Feed Filters & Stats */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 -mb-[9px] ${
              tab === 'all'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setTab('unread')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200 -mb-[9px] flex items-center gap-1.5 ${
              tab === 'unread'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-error text-[10px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {pagination && (
          <span className="text-xs text-text-secondary">
            Total: {pagination.total} notifications
          </span>
        )}
      </div>

      {/* Main Feed List */}
      <div className="flex flex-col gap-3 min-h-[300px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-sm font-medium">Loading notifications...</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-text-secondary/60" />
            </div>
            <h3 className="text-base font-extrabold text-text-primary">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications found'}
            </h3>
            <p className="text-xs text-text-secondary mt-1.5 max-w-[280px] text-center leading-relaxed">
              {tab === 'unread'
                ? 'You have read all notifications in your feed.'
                : 'Your notifications feed is currently empty. Actions related to your account, tasks, or committees will show up here.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
          <button
            disabled={page === 1 || isLoading}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-text-primary transition-all"
          >
            Previous
          </button>
          
          <span className="text-xs text-text-secondary font-medium">
            Page {page} of {pagination.total_pages}
          </span>
          
          <button
            disabled={page === pagination.total_pages || isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-text-primary transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
