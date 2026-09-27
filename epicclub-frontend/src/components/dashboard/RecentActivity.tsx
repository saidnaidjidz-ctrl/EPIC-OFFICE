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

// Helper to format date cleanly in Arabic
function timeAgo(dateString: string) {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'منذ لحظات';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDays === 1) return 'أمس';
    return `منذ ${diffDays} أيام`;
  } catch {
    return 'مؤخراً';
  }
}

// Helper for Audit action icon
function getActionIcon(action: string | undefined | null) {
  if (!action) return <Info className="w-4 h-4 text-[#7F91FF]" />;
  const lowercaseAction = action.toLowerCase();
  if (lowercaseAction.includes('create') || lowercaseAction.includes('add')) {
    return <Plus className="w-4 h-4 text-[#45CBB4]" />;
  }
  if (lowercaseAction.includes('delete') || lowercaseAction.includes('remove')) {
    return <Trash2 className="w-4 h-4 text-[#F18368]" />;
  }
  if (lowercaseAction.includes('update') || lowercaseAction.includes('edit')) {
    return <Edit className="w-4 h-4 text-[#2DC5D9]" />;
  }
  return <Info className="w-4 h-4 text-[#7F91FF]" />;
}

// Helper for Notification type icon
function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_assigned':
    case 'task_completed':
    case 'task_updated':
      return <CheckCircle2 className="w-4 h-4 text-[#45CBB4]" />;
    case 'meeting_scheduled':
    case 'meeting_updated':
    case 'meeting_cancelled':
      return <Calendar className="w-4 h-4 text-[#2DC5D9]" />;
    case 'role_changed':
    case 'committee_assigned':
      return <ShieldAlert className="w-4 h-4 text-[#F49A67]" />;
    default:
      return <Info className="w-4 h-4 text-[#66858F]" />;
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
    <div className="bg-white border border-[#CFE8ED] rounded-2xl shadow-sm p-6 flex flex-col gap-5 h-full min-h-[350px]">
      <div className="flex justify-between items-center border-b border-[#CFE8ED] pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base md:text-lg font-bold text-[#173B47] font-cairo">
            {isPresident ? 'نبض النادي والنشاطات الأخيرة' : 'أحدث التنبيهات والإشعارات'}
          </h3>
          <p className="text-xs text-[#66858F]">
            {isPresident ? 'سجل الرقابة وتتبع العمليات الإدارية' : 'آخر المستجدات والإشعارات والتذكيرات'}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED] text-[#2DC5D9]">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {isPresident ? (
        // ─── President view: Audit Logs ───────────────────────────────────────
        activities.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#66858F] text-sm font-medium">
            لا توجد سجلات تدقيق حتى الآن
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] hide-scrollbar pl-1">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3.5 p-3 rounded-xl bg-[#F0F8FA] border border-[#CFE8ED]/60 hover:border-[#2DC5D9]/50 transition-all duration-200"
              >
                <div className="p-2 rounded-lg bg-white border border-[#CFE8ED] mt-0.5 shadow-2xs">
                  {getActionIcon(activity.action || (activity as any).type)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-[#173B47] truncate">
                      {activity.user_name || 'عملية في النظام'}
                    </span>
                    <span className="text-[10px] text-[#66858F] font-semibold whitespace-nowrap">
                      {activity.created_at ? timeAgo(activity.created_at) : ((activity as any).time_ago || 'مؤخراً')}
                    </span>
                  </div>
                  <p className="text-xs text-[#66858F] mt-1">
                    {activity.action || (activity as any).message || 'تم تنفيذ العملية'} {activity.entity_type && <span className="font-bold text-[#2DC5D9]">{activity.entity_type}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ─── Member / Leader view: Notifications ──────────────────────────────
        notifications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#66858F] text-sm font-medium">
            لا توجد تنبيهات جديدة حالياً
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] hide-scrollbar pl-1">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${
                  notification.is_read 
                    ? 'bg-[#F0F8FA] border-[#CFE8ED]/60 hover:border-[#2DC5D9]/50' 
                    : 'bg-[#2DC5D9]/10 border-[#2DC5D9]/30 hover:border-[#2DC5D9]'
                }`}
              >
                <div className="p-2 rounded-lg bg-white border border-[#CFE8ED] mt-0.5 shadow-2xs">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-[#173B47] truncate">
                      {notification.title}
                    </span>
                    <span className="text-[10px] text-[#66858F] font-semibold whitespace-nowrap font-cairo">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-[#66858F] mt-1 line-clamp-2">
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
