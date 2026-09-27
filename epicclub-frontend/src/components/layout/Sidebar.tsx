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
        label: 'نظرة عامة',
        href: '/dashboard',
        icon: <Home className="w-5 h-5" />,
      },
      {
        label: role === 'president' ? 'كل المهام' : 'مهامي',
        href: '/dashboard/tasks',
        icon: role === 'president' ? <ClipboardList className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />,
      },
      {
        label: 'الاجتماعات',
        href: '/dashboard/meetings',
        icon: <CalendarDays className="w-5 h-5" />,
      },
      {
        label: 'التنبيهات',
        href: '/dashboard/notifications',
        icon: <Bell className="w-5 h-5" />,
      },
    ];

    // Leader and President only items
    if (role === 'president' || role === 'committee_leader') {
      items.push(
        {
          label: 'اللجان',
          href: '/dashboard/committees',
          icon: <FolderKanban className="w-5 h-5" />,
        },
        {
          label: 'التحليلات',
          href: '/dashboard/analytics',
          icon: <BarChart3 className="w-5 h-5" />,
        }
      );
    }

    // President-only admin panel (Members & Roles)
    if (role === 'president') {
      items.push({
        label: 'إدارة الأعضاء',
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
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-white border-l border-[#CFE8ED] overflow-hidden z-30 flex-shrink-0 shadow-sm"
    >
      {/* Brand logo header */}
      <div className={`relative flex items-center gap-3 px-4 py-5 border-b border-[#CFE8ED] h-16 flex-shrink-0 ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2DC5D9] to-[#38C9D8] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-extrabold text-sm tracking-tighter">EP</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-[#173B47]">
                EPIC CLUB
              </span>
              <span className="text-[10px] font-semibold text-[#2DC5D9] -mt-1 tracking-widest uppercase">
                OFFICE
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        {!collapsed && (
          <button
            onClick={handleCollapseToggle}
            className="p-1.5 rounded-lg text-[#66858F] hover:text-[#173B47] hover:bg-[#F0F8FA] transition-colors"
            title="طي القائمة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand toggle overlay button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2.5 border-b border-[#CFE8ED]">
          <button
            onClick={handleCollapseToggle}
            className="p-1.5 rounded-lg text-[#66858F] hover:text-[#173B47] hover:bg-[#F0F8FA] transition-colors"
            title="توسيع القائمة"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1.5 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                active
                  ? 'bg-[#2DC5D9]/15 text-[#173B47] font-bold border-r-4 border-[#2DC5D9]'
                  : 'text-[#66858F] hover:text-[#173B47] hover:bg-[#F0F8FA]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`flex-shrink-0 ${active ? 'text-[#2DC5D9]' : 'text-[#66858F] group-hover:text-[#173B47] transition-colors'}`}>
                {item.icon}
              </span>
              
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Footer block */}
      <div className="border-t border-[#CFE8ED] px-3 py-4 flex flex-col gap-3 flex-shrink-0 bg-[#F5FBFD]">
        {/* User Card */}
        <div className={`flex items-center gap-3 px-2.5 py-2 rounded-xl bg-white border border-[#CFE8ED] shadow-2xs overflow-hidden ${
          collapsed ? 'justify-center px-0 bg-transparent border-transparent shadow-none' : ''
        }`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DC5D9] to-[#7F91FF] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
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
              <p className="text-xs font-bold text-[#173B47] truncate">{user?.name || 'مستخدم'}</p>
              <span className="text-[10px] text-[#66858F] truncate flex items-center gap-1 mt-0.5 font-medium">
                {role === 'president' && <Shield className="w-3 h-3 text-[#F49A67]" />}
                {role === 'president' ? 'رئيس النادي' : role === 'committee_leader' ? 'قائد لجنة' : 'عضو'}
              </span>
            </div>
          )}
        </div>

        {/* Basic Settings Link & Logout Buttons */}
        <div className="flex flex-col gap-1">
          {role === 'president' && (
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#66858F] hover:text-[#173B47] hover:bg-white transition-all ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title={collapsed ? 'الإعدادات' : undefined}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>الإعدادات</span>}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#F18368] hover:bg-[#F18368]/10 transition-all ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? 'تسجيل الخروج' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
