'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import {
  Home,
  CheckSquare,
  ClipboardList,
  CalendarDays,
  Bell,
  FolderKanban,
  BarChart3,
  Crown,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import type { UserRole } from '@/types';

// Helper to get initials
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const role = user?.role || 'member';

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapse preference on mount (to avoid SSR mismatch)
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('epicclub-sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  const handleCollapseToggle = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('epicclub-sidebar-collapsed', JSON.stringify(nextState));
  };

  const handleLogout = () => {
    // 1. Clear cookies immediately (don't block on API)
    Cookies.remove('epicclub_session');
    Cookies.remove('epicclub_role');
    // 2. Clear Zustand store
    logout();
    // 3. Fire background logout request (best-effort, ignore errors)
    apiClient.post('/auth/logout').catch(() => {});
    // 4. Redirect to login
    router.push('/login');
  };

  // Determine navigation items dynamically based on role
  const navItems = React.useMemo(() => {
    const items = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <Home className="w-5 h-5" />,
      },
    ];

    // Tasks item: "All Tasks" for President, "My Tasks" for others
    if (role === 'president') {
      items.push({
        label: 'All Tasks',
        href: '/dashboard/tasks',
        icon: <ClipboardList className="w-5 h-5" />,
      });
    } else {
      items.push({
        label: 'My Tasks',
        href: '/dashboard/tasks',
        icon: <CheckSquare className="w-5 h-5" />,
      });
    }

    items.push(
      {
        label: 'Meetings',
        href: '/dashboard/meetings',
        icon: <CalendarDays className="w-5 h-5" />,
      },
      {
        label: 'Notifications',
        href: '/dashboard/notifications',
        icon: <Bell className="w-5 h-5" />,
      }
    );

    // Leader and President only items
    if (role === 'president' || role === 'committee_leader') {
      items.push(
        {
          label: 'Committees',
          href: '/dashboard/committees',
          icon: <FolderKanban className="w-5 h-5" />,
        },
        {
          label: 'Analytics',
          href: '/dashboard/analytics',
          icon: <BarChart3 className="w-5 h-5" />,
        }
      );
    }

    // President-only admin panel
    if (role === 'president') {
      items.push({
        label: 'Admin Panel',
        href: '/dashboard/users',
        icon: <Crown className="w-5 h-5" />,
      });
    }

    return items;
  }, [role]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  // Avoid rendering layout shifts until client mount has completed
  if (!mounted) {
    return (
      <aside className="hidden md:flex flex-col h-screen w-[260px] bg-[#1E293B] border-r border-white/5 flex-shrink-0" />
    );
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-[#1E293B] border-r border-white/5 overflow-hidden z-30 flex-shrink-0"
    >
      {/* Brand logo header */}
      <div className={`relative flex items-center gap-3 px-4 py-5 border-b border-white/5 h-16 flex-shrink-0 ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0 shadow-glow shadow-secondary/20">
            <span className="text-white font-extrabold text-sm">EC</span>
          </div>
          {!collapsed && (
            <span className="text-sm font-black tracking-wider text-text-primary uppercase bg-clip-text bg-gradient-to-r from-text-primary to-text-primary/80">
              Epic Club
            </span>
          )}
        </Link>

        {/* Collapse toggle button */}
        {!collapsed && (
          <button
            onClick={handleCollapseToggle}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand toggle overlay button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2.5 border-b border-white/5">
          <button
            onClick={handleCollapseToggle}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group border-l-2 relative overflow-hidden ${
                active
                  ? 'bg-secondary/10 text-secondary border-secondary shadow-inner'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
              } ${collapsed ? 'justify-center px-0 border-l-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {/* Collapse left accent indicator line */}
              {collapsed && active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-r-md" />
              )}
              
              <span className={`flex-shrink-0 ${active ? 'text-secondary' : 'text-text-secondary group-hover:text-text-primary transition-colors'}`}>
                {item.icon}
              </span>
              
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Footer block */}
      <div className="border-t border-white/5 px-3 py-4 flex flex-col gap-3 flex-shrink-0 bg-black/10">
        {/* User Card */}
        <div className={`flex items-center gap-3 px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden ${
          collapsed ? 'justify-center px-0 bg-transparent border-transparent' : ''
        }`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name}
                width={32}
                height={32}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>{user ? getInitials(user.name) : 'EC'}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.name || 'Guest'}</p>
              <span className="text-[10px] text-text-secondary capitalize truncate flex items-center gap-1.5 mt-0.5">
                {role === 'president' && <Shield className="w-2.5 h-2.5 text-warning" />}
                {role.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Basic Settings Link & Logout Buttons */}
        <div className="flex flex-col gap-1">
          {role === 'president' && (
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 transition-all ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
