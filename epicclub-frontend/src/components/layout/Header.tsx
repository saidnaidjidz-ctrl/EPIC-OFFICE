'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ChevronRight, User, Settings, LogOut, Shield, Menu } from 'lucide-react';
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

  // Derive page title from pathname
  const pageTitle = (() => {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'dashboard';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  })();

  // Generate dynamic breadcrumb list
  const getBreadcrumbs = () => {
    const list = [{ label: 'Home', href: '/dashboard', isLast: pathname === '/dashboard' }];
    const parts = pathname.split('/').filter(Boolean);

    if (pathname !== '/dashboard' && parts.length > 0) {
      // If starts with dashboard, skip first part since it maps to 'Home'
      const subParts = parts[0] === 'dashboard' ? parts.slice(1) : parts;
      
      subParts.forEach((part, idx) => {
        // Skip IDs in breadcrumbs (check if UUID or numeric)
        const isId = part.length > 20 || !isNaN(Number(part));
        const label = isId ? 'Details' : part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
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
    <header className="h-16 border-b border-white/5 bg-surface/85 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 flex-shrink-0">
      {/* Title & Breadcrumbs */}
      <div className="flex flex-col">
        {/* Dynamic Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-[10px] text-text-secondary/70 font-semibold mb-0.5">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href + idx}>
              {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-text-secondary/40" />}
              {crumb.isLast ? (
                <span className="text-text-secondary/90 font-bold">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-text-primary transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
        <h2 className="text-sm md:text-base font-extrabold text-text-primary tracking-tight leading-none">
          {pageTitle}
        </h2>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-4">
        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search tasks, meetings..."
            className="w-full bg-white/[0.03] border border-white/5 hover:border-white/10 focus:border-secondary/40 focus:bg-white/[0.05] rounded-xl pl-10 pr-12 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 transition-all outline-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-text-secondary/80 pointer-events-none select-none font-mono">
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
            aria-label="User profile options"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white ring-2 ring-transparent group-hover:ring-accent/40 transition-all duration-200">
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
            <div className="absolute right-0 mt-2.5 w-56 card-glass border border-white/10 rounded-2xl shadow-2xl py-1.5 z-[100] animate-scale-in">
              {/* Profile Overview */}
              <div className="px-4 py-2 border-b border-white/5 bg-white/[0.01]">
                <p className="text-xs font-bold text-text-primary truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-text-secondary/80 truncate mt-0.5">{user?.email}</p>
                <div className="mt-1.5 flex">
                  <span className="text-[9px] font-extrabold capitalize bg-secondary/15 text-secondary px-2 py-0.5 rounded-full border border-secondary/20">
                    {user?.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors font-semibold"
                >
                  <User className="w-4 h-4 text-text-secondary/70" /> Profile Settings
                </Link>
                {user?.role === 'president' && (
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors font-semibold"
                  >
                    <Settings className="w-4 h-4 text-text-secondary/70" /> Admin Settings
                  </Link>
                )}
              </div>

              <div className="border-t border-white/5 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-error/80 hover:text-error hover:bg-error/10 transition-colors font-semibold text-left"
                >
                  <LogOut className="w-4 h-4 text-error/70" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
