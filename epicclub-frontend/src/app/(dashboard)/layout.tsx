'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PageWrapper from '@/components/layout/PageWrapper';
import ToastContainer from '@/components/notifications/ToastContainer';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      {/* Collapsible Left Sidebar - Visible on Desktop only (md:flex) */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header Bar (dynamic titles, breadcrumbs, search, user dropdown) */}
        <Header />

        {/* Dynamic transition container for nested page views */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Visible on Mobile only (md:hidden) */}
      <MobileNav />

      {/* Real-time Custom Toast alert overlay stack */}
      <ToastContainer />
    </div>
  );
}
