'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ChevronRight, ChevronLeft, User, Settings, LogOut, Shield, Menu } from 'lucide-react';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';
import NotificationBell from '../notifications/NotificationBell';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchVal, setSearchVal] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on Ctrl+K / Meta+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/dashboard/tasks?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    // 1. Clear cookies immediately
    Cookies.remove('epicclub_session');
    Cookies.remove('epicclub_role');
    // 2. Clear Zustand store
    logout();
    // 3. Background API call (best-effort)
    apiClient.post('/auth/logout').catch(() => {});
    // 4. Navigate to login
    router.push('/login');
  };

  // Derive Arabic page title from pathname
  const pageTitle = (() => {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'dashboard';
    const arabicTitles: Record<string, string> = {
      dashboard: 'لوحة التحكم العامة',
      tasks: 'إدارة المهام',
      meetings: 'جدول الاجتماعات',
      notifications: 'مركز التنبيهات',
      committees: 'اللجان وفرق العمل',
      analytics: 'تحليلات الأداء',
      users: 'إدارة الأعضاء والصلاحيات',
      settings: 'إعدادات النظام',
    };
    return arabicTitles[last] || last;
  })();

  // Generate dynamic Arabic breadcrumb list
  const getBreadcrumbs = () => {
    const list = [{ label: 'الرئيسية', href: '/dashboard', isLast: pathname === '/dashboard' }];
    const parts = pathname.split('/').filter(Boolean);

    const arabicBreadcrumbMap: Record<string, string> = {
      tasks: 'المهام',
      meetings: 'الاجتماعات',
      notifications: 'التنبيهات',
      committees: 'اللجان',
      analytics: 'التحليلات',
      users: 'الأعضاء',
      settings: 'الإعدادات',
    };

    if (pathname !== '/dashboard' && parts.length > 0) {
      const subParts = parts[0] === 'dashboard' ? parts.slice(1) : parts;
      
      subParts.forEach((part, idx) => {
        const isId = part.length > 20 || !isNaN(Number(part));
        const label = isId ? 'التفاصيل' : arabicBreadcrumbMap[part] || part;
        const href = '/dashboard/' + subParts.slice(0, idx + 1).join('/');
        
        list.push({
          label,
          href,
          isLast: idx === subParts.length - 1,
        });
      });
    }
    return list;
  };

  const breadcrumbs = getBreadcrumbs();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="h-16 border-b border-[#CFE8ED] bg-white/95 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 flex-shrink-0 shadow-2xs">
      {/* Title & Breadcrumbs */}
      <div className="flex flex-col">
        {/* Dynamic Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-[#66858F] font-medium mb-0.5">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href + idx}>
              {idx > 0 && <ChevronLeft className="w-3 h-3 text-[#CFE8ED]" />}
              {crumb.isLast ? (
                <span className="text-[#173B47] font-bold">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-[#2DC5D9] transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h2 className="text-sm md:text-base font-bold text-[#173B47] tracking-tight leading-none font-cairo">
          {pageTitle}
        </h2>
      </div>

      {/* Header Left Actions (in RTL, this is on the visual left) */}
      <div className="flex items-center gap-3.5">
        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-52 lg:w-72">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66858F]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="بحث سريع داخل مساحة العمل..."
            className="w-full bg-[#F5FBFD] border border-[#CFE8ED] hover:border-[#2DC5D9]/50 focus:border-[#2DC5D9] focus:bg-white rounded-xl pr-10 pl-14 py-2 text-xs text-[#173B47] placeholder:text-[#66858F] transition-all outline-none font-cairo"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-[#CFE8ED] text-[9px] font-bold text-[#66858F] pointer-events-none select-none font-jakarta">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </form>

        {/* Real-time Notification Bell */}
        <NotificationBell />

        {/* User Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 group outline-none"
            aria-label="خيارات الحساب"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DC5D9] to-[#7F91FF] flex items-center justify-center text-xs font-bold text-white ring-2 ring-transparent group-hover:ring-[#2DC5D9]/40 transition-all duration-200">
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
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2.5 w-60 bg-white border border-[#CFE8ED] rounded-2xl shadow-xl py-1.5 z-[100] animate-scale-in">
              {/* Profile Overview */}
              <div className="px-4 py-2.5 border-b border-[#CFE8ED] bg-[#F5FBFD]/60">
                <p className="text-xs font-bold text-[#173B47] truncate">{user?.name || 'مستخدم'}</p>
                <p className="text-[10px] text-[#66858F] truncate mt-0.5 font-jakarta">{user?.email}</p>
                <div className="mt-1.5 flex">
                  <span className="text-[10px] font-bold bg-[#2DC5D9]/15 text-[#173B47] px-2.5 py-0.5 rounded-full border border-[#2DC5D9]/30">
                    {user?.role === 'president' ? 'رئيس النادي' : user?.role === 'committee_leader' ? 'قائد لجنة' : 'عضو'}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#173B47] hover:bg-[#F0F8FA] transition-colors"
                >
                  <User className="w-4 h-4 text-[#66858F]" />
                  <span>الملف الشخصي</span>
                </Link>
                {user?.role === 'president' && (
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#173B47] hover:bg-[#F0F8FA] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#66858F]" />
                    <span>إعدادات النظام</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#F18368] hover:bg-[#F18368]/10 transition-colors text-right"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
