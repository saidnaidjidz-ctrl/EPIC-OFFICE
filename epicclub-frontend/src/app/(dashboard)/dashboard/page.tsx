'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { ApiResponse, PresidentDashboard, LeaderDashboard, MemberDashboard } from '@/types';

import StatsGrid from '@/components/dashboard/StatsGrid';
import TasksOverview from '@/components/dashboard/TasksOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import UpcomingMeetings from '@/components/dashboard/UpcomingMeetings';
import CommitteePerformance from '@/components/dashboard/CommitteePerformance';
import QuickActions from '@/components/dashboard/QuickActions';
import { LayoutDashboard, AlertCircle, RefreshCw } from 'lucide-react';

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-5 w-96" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-glass p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-8 w-16" />
              </div>
              <div className="skeleton h-10 w-10 rounded-xl" />
            </div>
            <div className="skeleton h-4 w-32 mt-2" />
          </div>
        ))}
      </div>

      {/* Charts / Lists Grid Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-glass p-6 h-[380px] flex flex-col gap-4">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-72" />
          <div className="flex-1 skeleton rounded-xl mt-4" />
        </div>
        <div className="card-glass p-6 h-[380px] flex flex-col gap-4">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-72" />
          <div className="flex-1 skeleton rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isInitialized } = useAuthStore();
  const role = user?.role || 'member';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: async () => {
      const response = await apiClient.get<any>(
        '/dashboard/stats'
      );
      return response;
    },
    enabled: !!user,
    retry: 2,
    retryDelay: 3000,
  });

  // While auth is initializing (Zustand rehydrating), show skeleton
  if (!isInitialized) {
    return <DashboardSkeleton />;
  }

  // Auth is done but no user — middleware should redirect to login
  // Show skeleton briefly while Next.js navigation happens
  if (!user) {
    return <DashboardSkeleton />;
  }

  // Auth ok but data is loading
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center animate-fade-in p-6">
        <div className="p-4 rounded-full bg-error/10 border border-error/30 text-error">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-text-primary">Dashboard Loading Failed</h3>
          <p className="text-sm text-text-secondary max-w-md">
            We ran into an issue connecting to the Epic Club database. Please try again or contact administration.
          </p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Sync
        </button>
      </div>
    );
  }

  // Determine appropriate dashboard data type
  const presidentData = data as PresidentDashboard;
  const leaderData = data as LeaderDashboard;
  const memberData = data as MemberDashboard;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
              Epic Control Panel
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Welcome back, <span className="font-semibold text-gradient-primary">{user.name}</span>. Scoped role: <span className="font-semibold capitalize text-accent">{role.replace('_', ' ')}</span>
          </p>
        </div>

        {/* Global Dashboard Action (Refresh sync) */}
        <button 
          onClick={() => refetch()} 
          className="btn-ghost text-xs flex items-center gap-2 py-2 px-3 hover:shadow-glow-cyan/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Panel
        </button>
      </div>

      {/* 1. Stats Cards Grid */}
      <StatsGrid role={role} data={data!} />

      {/* 2. Primary Charts and Tables Section */}
      {role === 'president' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CommitteePerformance role={role} data={presidentData} />
          </div>
          <div>
            <TasksOverview tasks={presidentData.tasks} />
          </div>
        </div>
      )}

      {role === 'committee_leader' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CommitteePerformance role={role} data={leaderData} />
          </div>
          <div>
            <TasksOverview tasks={leaderData.tasks} />
          </div>
        </div>
      )}

      {role === 'member' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UpcomingMeetings meetings={memberData.upcoming_meetings || []} />
          </div>
          <div>
            <TasksOverview tasks={memberData.my_tasks} />
          </div>
        </div>
      )}

      {/* 3. Feeds, Timeline and Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {role === 'president' && (
            <RecentActivity role={role} activities={presidentData.recent_activity || []} />
          )}
          {role === 'committee_leader' && (
            <UpcomingMeetings meetings={leaderData.upcoming_meetings || []} />
          )}
          {role === 'member' && (
            <RecentActivity role={role} notifications={memberData.recent_notifications || []} />
          )}
        </div>
        <div>
          <QuickActions role={role} />
        </div>
      </div>
    </div>
  );
}
