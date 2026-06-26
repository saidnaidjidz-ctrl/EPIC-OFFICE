'use client';

import React from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  CalendarPlus, 
  Users, 
  CheckSquare, 
  BellRing, 
  FolderKanban,
  Activity,
  ArrowRight
} from 'lucide-react';
import type { UserRole } from '@/types';

interface QuickActionTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
}

function QuickActionTile({ title, description, icon, href, colorClass }: QuickActionTileProps) {
  return (
    <Link href={href} className="group relative block rounded-2xl border border-border/40 bg-surface-2/30 p-4 transition-all duration-300 hover:border-border/80 hover:bg-surface-2/60">
      {/* Background colored hover glow */}
      <div className="absolute inset-0 -z-10 rounded-2xl opacity-0 bg-gradient-to-br from-transparent to-surface-2 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex gap-4 items-start">
        <div className={`p-3 rounded-xl ${colorClass} text-white shadow-inner flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>
        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors duration-200">
              {title}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
          <span className="text-2xs text-text-secondary mt-1 font-medium leading-relaxed">
            {description}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface QuickActionsProps {
  role: UserRole;
}

export default function QuickActions({ role }: QuickActionsProps) {
  const isLeader = role === 'president' || role === 'committee_leader';

  return (
    <div className="card-glass p-6 flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1 border-b border-border/50 pb-4">
        <h3 className="text-lg font-bold text-text-primary">Quick Control Panel</h3>
        <p className="text-xs text-text-secondary">Direct links to primary operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {isLeader ? (
          <>
            <QuickActionTile 
              title="Create Task" 
              description="Assign new work item to committee member" 
              icon={<PlusCircle className="w-5 h-5" />} 
              href="/dashboard/tasks/new" 
              colorClass="bg-gradient-primary"
            />
            <QuickActionTile 
              title="Schedule Meeting" 
              description="Organize a new virtual or in-person sync" 
              icon={<CalendarPlus className="w-5 h-5" />} 
              href="/dashboard/meetings/new" 
              colorClass="bg-gradient-accent"
            />
            <QuickActionTile 
              title="Committees Hub" 
              description="Monitor activities and manage memberships" 
              icon={<FolderKanban className="w-5 h-5" />} 
              href="/dashboard/committees" 
              colorClass="bg-surface-2 border border-border/80 text-text-primary"
            />
            <QuickActionTile 
              title="Audit Logs" 
              description="Browse club records and admin actions" 
              icon={<Activity className="w-5 h-5" />} 
              href="/dashboard/audit" 
              colorClass="bg-surface-2 border border-border/80 text-text-primary"
            />
          </>
        ) : (
          <>
            <QuickActionTile 
              title="My Task Sheet" 
              description="Track, update status, and view due dates" 
              icon={<CheckSquare className="w-5 h-5" />} 
              href="/dashboard/tasks" 
              colorClass="bg-gradient-primary"
            />
            <QuickActionTile 
              title="Upcoming Syncs" 
              description="Join conferences and review schedules" 
              icon={<CalendarPlus className="w-5 h-5" />} 
              href="/dashboard/meetings" 
              colorClass="bg-gradient-accent"
            />
            <QuickActionTile 
              title="Committees" 
              description="Browse teams and contact leaders" 
              icon={<Users className="w-5 h-5" />} 
              href="/dashboard/committees" 
              colorClass="bg-surface-2 border border-border/80 text-text-primary"
            />
            <QuickActionTile 
              title="Alerts Center" 
              description="Review all system notifications" 
              icon={<BellRing className="w-5 h-5" />} 
              href="/dashboard/notifications" 
              colorClass="bg-surface-2 border border-border/80 text-text-primary"
            />
          </>
        )}
      </div>
    </div>
  );
}
